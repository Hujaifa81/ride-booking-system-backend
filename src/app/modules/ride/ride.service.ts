/* eslint-disable @typescript-eslint/no-explicit-any */
import { JwtPayload } from "jsonwebtoken";
import { IRide, RideStatus } from "./ride.interface";
import { Ride } from "./ride.model";
import { calculateApproxFareWithSurge } from "../../utils/fareCalculation";
import httpStatus from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { cancelRide, completedRide, driverArrived, goingToPickup, inTransitRide, reachedDestinationRide } from "../../utils/rideStatusChange";
import { Vehicle } from "../vehicle/vehicle.model";
import { findNearestAvailableDriver } from "../../utils/findNearestAvailableDriver";
import { Driver } from "../driver/driver.model";
import { DriverStatus, ILocation } from "../driver/driver.interface";
import { agenda } from "../../agenda/agenda";
import { User } from "../user/user.model";
import { Role } from "../user/user.interface";
import { QueryBuilder } from "../../utils/queryBuilder";


const createRide = async (rideData: Partial<IRide>, token: JwtPayload) => {
    const rides = await Ride.find({ user: token.userId, status: { $in: [RideStatus.ACCEPTED, RideStatus.IN_TRANSIT, RideStatus.GOING_TO_PICK_UP, RideStatus.DRIVER_ARRIVED, RideStatus.REQUESTED, RideStatus.PENDING] } });
    const user = await User.findById(token.userId);

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

    const totalCancelledRidesToday = await Ride.countDocuments({
        user: token.userId,
        statusHistory: {
            $elemMatch: {
                status: RideStatus.CANCELLED_BY_RIDER,
                timestamp: { $gte: todayStart, $lt: todayEnd }
            }
        }
    });


    const maxCancellationsPerDay = 3;

    if (totalCancelledRidesToday >= maxCancellationsPerDay) {
        throw new AppError(httpStatus.BAD_REQUEST, `You have reached the maximum limit of ${maxCancellationsPerDay} cancelled rides for today. You cannot request a new ride until tomorrow.`);
    }

    if (rides.length > 0) {
        throw new AppError(httpStatus.BAD_REQUEST, "You have an ongoing ride. Please complete or cancel the current ride before requesting a new one.");
    }

    if (!user?.phone) {
        throw new AppError(httpStatus.BAD_REQUEST, "Please add your phone number in profile before requesting a ride.");
    }


    if (rideData.pickupLocation && rideData.dropOffLocation) {
        if (rideData.pickupLocation.coordinates[0] === rideData.dropOffLocation.coordinates[0] && rideData.pickupLocation.coordinates[1] === rideData.dropOffLocation.coordinates[1]) {
            throw new AppError(httpStatus.BAD_REQUEST, "Pickup and drop-off locations cannot be the same.");
        }
    }
    let approxFare = 0;

    if (rideData.pickupLocation && rideData.dropOffLocation) {
        approxFare = await calculateApproxFareWithSurge(rideData.pickupLocation, rideData.dropOffLocation);
    }
    rideData.approxFare = approxFare;


    const ride = await Ride.create({
        ...rideData,
        user: token.userId,
        rejectedDrivers: [],
        statusHistory: [{
            status: RideStatus.REQUESTED,
            timestamp: new Date(),
            by: token.userId
        }]
    });

    const driver = await findNearestAvailableDriver(ride._id.toString())

    if (!driver) {
        ride.status = RideStatus.PENDING;
        await ride.save();

        // Start repeating job to retry assignment every 30 sec
        await agenda.every("30 seconds", "checkPendingRide", { rideId: ride._id.toString() });
        return ride;
    }
    const activeVehicle = await Vehicle.findOne({ user: driver.user, isActive: true });
    ride.vehicle = activeVehicle?._id;
    ride.driver = driver?._id;

    await ride.save();
    // Schedule job to check driver response after 5 minute
    await agenda.schedule("5 minutes", "driverResponseTimeout", { rideId: ride._id.toString(), driverId: driver._id.toString() });

    return ride;
}

const rideStatusChangeAfterRideAccepted = async (rideId: string, status: RideStatus, token: JwtPayload) => {

    if (status === RideStatus.GOING_TO_PICK_UP) {
        const ride = await goingToPickup(rideId, token);
        return ride;

    }

    if (status === RideStatus.DRIVER_ARRIVED) {
        const ride = await driverArrived(rideId, token);
        return ride;

    }

    if (status === RideStatus.IN_TRANSIT) {
        const ride = await inTransitRide(rideId, token);
        return ride;
    }

    if (status === RideStatus.REACHED_DESTINATION) {
        const ride = await reachedDestinationRide(rideId, token);
        return ride;

    }

    if (status === RideStatus.COMPLETED) {
        const ride = await completedRide(rideId, token);
        return ride;
    }

}

const canceledRide = async (rideId: string, canceledReason: string, token: JwtPayload) => {
    const ride = cancelRide(rideId, canceledReason, token);
    return ride;
}

const getAllRides = async () => {
    const rides = await Ride.find().populate('driver').populate('user');
    const ridesWithVehicle = await Promise.all(rides.map(async (ride) => {
        const vehicle = await Vehicle.findById(ride.vehicle)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unused-vars
        const { user, _id, ...vehicleData } = vehicle!.toObject();
        return {
            ...(ride as any).toObject(),
            vehicle: vehicleData
        };

    }))
    return ridesWithVehicle;
}


const getRideHistory = async (userId: string, token: JwtPayload, query: Record<string, string>) => {
  if (userId !== token.userId && token.role !== Role.ADMIN) {
    throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized to view this ride history");
  }

  // Resolve whose rides to fetch based on role
  let filter: any = {};

  if (token.role === Role.RIDER) {
    filter = { user: userId };
  } else if (token.role === Role.DRIVER) {
    const driver = await Driver.findOne({ user: userId });
    if (!driver) {
      throw new AppError(httpStatus.BAD_REQUEST, "You are not registered as a driver");
    }
    filter = { driver: driver._id };
  } else if (token.role === Role.ADMIN) {
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }
    if (targetUser.role === Role.RIDER) {
      filter = { user: userId };
    } else if (targetUser.role === Role.DRIVER) {
      const driver = await Driver.findOne({ user: userId });
      if (!driver) {
        throw new AppError(httpStatus.BAD_REQUEST, "This user is not registered as a driver");
      }
      filter = { driver: driver._id };
    } else {
      filter = { user: userId }; // default fallback
    }
  }

  // Build query with populations (avoid N+1 for vehicle)
  const baseQuery = Ride.find(filter)
    .populate('driver')
    .populate('user')
    .populate({ path: 'vehicle', select: '-user' });

  const qb = new QueryBuilder(baseQuery as any, query);
  const built = await qb
    .dateBetweenSearch("createdAt")
    .filter()
    .sort()
    .paginate();

  const [data, meta] = await Promise.all([built.build(), qb.getMeta()]);

  // Ensure vehicle is null-safe
  const ridesWithVehicle = data.map((ride: any) => {
    const obj = typeof ride.toObject === 'function' ? ride.toObject() : ride;
    return {
      ...obj,
      vehicle: obj.vehicle ?? null,
    };
  });

  return { meta, data: ridesWithVehicle };
};
// ...existing code...

const getSingleRideDetails = async (rideId: string, token: JwtPayload) => {
    const ride = await Ride.findById(rideId).populate('driver').populate('user');
    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }

    if (ride.user._id.toString() !== token.userId && ride.driver?._id.toString() !== token.userId && token.role !== 'admin') {
        throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized to view this ride details");
    }
    const rideWithVehicle = await Vehicle.findById(ride.vehicle)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unused-vars
    const { user, _id, ...vehicleData } = rideWithVehicle!.toObject();
    return {
        ...ride.toObject(),
        vehicle: vehicleData
    };



}

const rejectRide = async (rideId: string, token: JwtPayload) => {
    const ride = await Ride.findOne({ _id: rideId });
    const driver = await Driver.findOne({ user: token.userId });

    if (!driver) {
        throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
    }

    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }

    if (ride.driver?.toString() !== driver._id.toString()) {
        throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized to reject this ride");
    }

    if (ride.user.toString() === token.userId) {
        throw new AppError(httpStatus.BAD_REQUEST, "You cannot reject your own ride request");
    }

    if (ride.status !== RideStatus.REQUESTED) {
        throw new AppError(httpStatus.BAD_REQUEST, "You can only reject a ride that is in requested status");
    }

    ride.rejectedDrivers.push(driver._id);
    ride.driver = null;
    ride.vehicle = null;
    await ride.save();
    // Cancel any existing timeout job for this ride and driver
    await agenda.cancel({ name: "driverResponseTimeout", "data.rideId": ride._id.toString(), "data.driverId": driver._id.toString() });

    const newDriver = await findNearestAvailableDriver(ride._id.toString());


    if (newDriver) {
        ride.driver = newDriver._id;
        const activeVehicle = await Vehicle.findOne({ user: newDriver.user, isActive: true });
        ride.vehicle = activeVehicle?._id;
        await ride.save();
        // Schedule new timeout job for the newly assigned driver
        await agenda.schedule("5 minutes", "driverResponseTimeout", { rideId: ride._id.toString(), driverId: newDriver._id.toString() });

    } else {
        ride.status = RideStatus.PENDING;
        ride.statusHistory.push({
            status: RideStatus.PENDING,
            timestamp: new Date(),
            by: 'SYSTEM'
        });
        await ride.save();
        // Start repeating job to retry assignment every 30 sec
        await agenda.every("30 seconds", "checkPendingRide", { rideId: ride._id.toString() });

    }

    return ride;
}

const acceptRide = async (rideId: string, token: JwtPayload) => {
    const ride = await Ride.findById(rideId);
    const driver = await Driver.findOne({ user: token.userId });

    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }

    if (ride.driver?.toString() !== driver?._id.toString()) {
        throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized to accept this ride");
    }

    if (ride.user.toString() === token.userId) {
        throw new AppError(httpStatus.BAD_REQUEST, "You cannot accept your own ride request");
    }

    if (ride.status !== RideStatus.REQUESTED) {
        throw new AppError(httpStatus.BAD_REQUEST, "You can only accept a ride that is in requested status");
    }

    if (!driver) {
        throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
    }

    if (driver.status !== DriverStatus.AVAILABLE) {
        throw new AppError(httpStatus.BAD_REQUEST, "You are not available to accept rides. Please set your status to AVAILABLE.");
    }

    if (driver.activeRide) {
        throw new AppError(httpStatus.BAD_REQUEST, "You already have an active ride. Please complete or cancel the current ride before accepting a new one.");
    }


    const activeVehicle = await Vehicle.findOne({ user: token.userId, isActive: true });

    ride.status = RideStatus.ACCEPTED;
    ride.statusHistory.push({
        status: RideStatus.ACCEPTED,
        timestamp: new Date(),
        by: token.userId
    });
    ride.vehicle = activeVehicle?._id;
    await ride.save();
    if (driver) {
        driver.activeRide = ride._id;
        driver.status = DriverStatus.ON_TRIP;
        await driver.save();
    }
    // Cancel any existing timeout job for this ride and driver
    await agenda.cancel({ name: "driverResponseTimeout", "data.rideId": ride._id.toString(), "data.driverId": token.userId });
    await agenda.cancel({ name: "checkPendingRide", "data.rideId": ride._id.toString() });

    const updatedRide = await Ride.findById(rideId)
        .populate('user')
        .populate('driver')
        .populate('vehicle')
        .lean();
    return updatedRide;
}

const createFeedback = async (rideId: string, feedback: string, token: JwtPayload) => {
    const ride = await Ride.findById(rideId);

    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }
    if (ride.user.toString() !== token.userId) {
        throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized to add feedback to this ride");
    }

    if (ride.status !== RideStatus.COMPLETED) {
        throw new AppError(httpStatus.BAD_REQUEST, "You can only add feedback to a completed ride");
    }
    ride.feedback = feedback;
    await ride.save();
    return ride;
}

const getActiveRideForRider = async (userId: string) => {
    const ride = await Ride.findOne({
        user: userId,
        status: {
            $in: [
                RideStatus.REQUESTED,
                RideStatus.ACCEPTED,
                RideStatus.DRIVER_ARRIVED,
                RideStatus.GOING_TO_PICK_UP,
                RideStatus.IN_TRANSIT,
                RideStatus.REACHED_DESTINATION,
                RideStatus.PENDING
            ]
        }
    }).populate('driver').populate('user');

    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "No active ride found");
    }

    //  Handle vehicle data safely
    let vehicleData = null;

    try {
        if (ride.vehicle) {
            const vehicle = await Vehicle.findById(ride.vehicle);
            if (vehicle) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { user, _id, ...vehicleInfo } = vehicle.toObject();
                vehicleData = vehicleInfo;
            }
        }
    } catch (error) {
        console.error('Error fetching vehicle data:', error);
        // Continue without vehicle data rather than failing
    }

    return {
        ...ride.toObject(),
        vehicle: vehicleData // Will be null if no vehicle or vehicle not found
    };
}

const getApproximateFare = async (pickupLocation: ILocation, dropOffLocation: ILocation) => {
    const fare = await calculateApproxFareWithSurge(pickupLocation, dropOffLocation);
    return fare;
}

const getTotalRidesCount = async (userId: string, token: JwtPayload) => {
    if (userId !== token.userId && token.role !== Role.ADMIN) {
        throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized to view this ride count");
    }
    if (token.role === Role.RIDER) {
        const totalRides = await Ride.countDocuments({ user: userId, status: RideStatus.COMPLETED });
        const cancelledRides = await Ride.countDocuments({ user: userId, status: { $in: [RideStatus.CANCELLED_BY_RIDER, RideStatus.CANCELLED_BY_DRIVER, RideStatus.CANCELLED_BY_ADMIN, RideStatus.CANCELLED_FOR_PENDING_TIME_OVER] } });
        return { totalRides, cancelledRides };
    }
    else if (token.role === Role.DRIVER) {
        const driver = await Driver.findOne({ user: userId });
        if (!driver) {
            throw new AppError(httpStatus.BAD_REQUEST, "You are not registered as a driver");
        }
        const totalRides = await Ride.countDocuments({ driver: driver._id, status: RideStatus.COMPLETED });
        const cancelledRides = await Ride.countDocuments({ driver: driver._id, status: { $in: [RideStatus.CANCELLED_BY_RIDER, RideStatus.CANCELLED_BY_DRIVER, RideStatus.CANCELLED_BY_ADMIN, RideStatus.CANCELLED_FOR_PENDING_TIME_OVER] } });
        return { totalRides, cancelledRides };
    }
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid user role for ride count");
}


export const RideService = {
    createRide,
    rideStatusChangeAfterRideAccepted,
    canceledRide,
    getRideHistory,
    getSingleRideDetails,
    getAllRides,
    rejectRide,
    acceptRide,
    createFeedback,
    getActiveRideForRider,
    getApproximateFare,
    getTotalRidesCount
};