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
import { DriverStatus } from "../driver/driver.interface";
import { agenda } from "../../agenda/agenda";
import { User } from "../user/user.model";
import { Role } from "../user/user.interface";


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

const getRideHistory = async (userId: string, token: JwtPayload) => {
    if (userId !== token.userId && token.role !== Role.ADMIN) {
        throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized to view this ride history");
    }
    let rides = [] as IRide[];

    if (token.role === Role.RIDER) {
        rides = await Ride.find({ user: userId }).populate('driver').populate('user');
    }
    else if (token.role === Role.DRIVER) {
        const driver = await Driver.findOne({ user: userId });

        if (!driver) {
            throw new AppError(httpStatus.BAD_REQUEST, "You are not registered as a driver");
        }
        rides = await Ride.find({ driver: driver._id }).populate('driver').populate('user');
    }
    else if (token.role === Role.ADMIN) {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError(httpStatus.NOT_FOUND, "User not found");
        }
        if (user.role === Role.RIDER) {
            rides = await Ride.find({ user: userId }).populate('driver').populate('user');
        }
        else if (user.role === Role.DRIVER) {
            const driver = await Driver.findOne({ user: userId });
            if (!driver) {
                throw new AppError(httpStatus.BAD_REQUEST, "This user is not registered as a driver");
            }
            rides = await Ride.find({ driver: driver._id }).populate('driver').populate('user');
        }
    }

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
    return ride;
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

export const RideService = {
    createRide,
    rideStatusChangeAfterRideAccepted,
    canceledRide,
    getRideHistory,
    getSingleRideDetails,
    getAllRides,
    rejectRide,
    acceptRide,
    createFeedback
};