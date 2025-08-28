import { JwtPayload } from "jsonwebtoken";
import { IRide, RideStatus } from "./ride.interface";
import { Ride } from "./ride.model";
import { approxFareCalculation } from "../../utils/fareCalculation";
import httpStatus from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { cancelRide, completedRide, driverArrived, goingToPickup, inTransitRide, reachedDestinationRide } from "../../utils/rideStatusChange";
import { Vehicle } from "../vehicle/vehicle.model";
import { findNearestAvailableDriver } from "../../utils/findNearestAvailableDriver";
import { Driver } from "../driver/driver.model";
import { DriverStatus } from "../driver/driver.interface";
import { agenda } from "../../agenda/agenda";


const createRide = async (rideData: Partial<IRide>, token: JwtPayload) => {
    const rides = await Ride.find({ user: token.userId, status: { $in: [RideStatus.ACCEPTED, RideStatus.IN_TRANSIT, RideStatus.GOING_TO_PICK_UP, RideStatus.DRIVER_ARRIVED, RideStatus.REQUESTED, RideStatus.PENDING] } });

    if (rides.length > 0) {
        throw new AppError(httpStatus.BAD_REQUEST, "You have an ongoing ride. Please complete or cancel the current ride before requesting a new one.");
    }

    if (rideData.pickupLocation && rideData.dropOffLocation) {
        if (rideData.pickupLocation.coordinates[0] === rideData.dropOffLocation.coordinates[0] && rideData.pickupLocation.coordinates[1] === rideData.dropOffLocation.coordinates[1]) {
            throw new AppError(httpStatus.BAD_REQUEST, "Pickup and drop-off locations cannot be the same.");
        }
    }
    let approxFare = 0;

    if (rideData.pickupLocation && rideData.dropOffLocation) {
        approxFare = approxFareCalculation(rideData.pickupLocation, rideData.dropOffLocation);
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
    ride.driver = driver?._id;
    await ride.save();
    // Schedule job to check driver response after 1 minute
    await agenda.schedule("1 minute", "driverResponseTimeout", { rideId: ride._id.toString(), driverId: driver._id.toString() });
    
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
            ...ride.toObject(),
            vehicle: vehicleData
        };

    }))
    return ridesWithVehicle;
}

const getRideHistory = async (userId: string, token: JwtPayload) => {
    if (userId !== token.userId && token.role !== 'admin') {
        throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized to view this ride history");
    }
    const rides = await Ride.find({ user: userId }).populate('driver').populate('user');

    const ridesWithVehicle = await Promise.all(rides.map(async (ride) => {
        const vehicle = await Vehicle.findById(ride.vehicle)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unused-vars
        const { user, _id, ...vehicleData } = vehicle!.toObject();
        return {
            ...ride.toObject(),
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

    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }

    if (ride.driver?.toString() !== token.userId) {
        throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized to reject this ride");
    }

    if (ride.status !== RideStatus.REQUESTED) {
        throw new AppError(httpStatus.BAD_REQUEST, "You can only reject a ride that is in requested status");
    }

    ride.rejectedDrivers.push(token.userId);
    ride.driver = null;
    await ride.save();
    // Cancel any existing timeout job for this ride and driver
    await agenda.cancel({ name: "driverResponseTimeout", "data.rideId": ride._id, "data.driverId": token.userId });

    const newDriver = await findNearestAvailableDriver(ride._id.toString());

    if (newDriver) {
        ride.driver = newDriver._id;
        await ride.save();
        // Schedule new timeout job for the newly assigned driver
        await agenda.schedule("1 minute", "driverResponseTimeout", { rideId: ride._id.toString(), driverId: newDriver._id.toString() });

    } else {
        ride.status = RideStatus.PENDING;
        ride.statusHistory.push({
            status: RideStatus.PENDING,
            timestamp: new Date(),
            by: 'SYSTEM'
        });
        await ride.save();
        // Start repeating job to retry assignment every 30 sec
        await agenda.every("30 seconds", "checkPendingRide", { rideId: ride._id.toString()});

    }

    return ride;
}

const acceptRide = async (rideId: string, token: JwtPayload) => {
    const ride = await Ride.findById(rideId);
    const driver= await Driver.findOne({ user: token.userId });

    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }
    
    if (ride.driver?.toString() !== driver?._id.toString()) {
        throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized to accept this ride");
    }


    if (ride.status !== RideStatus.REQUESTED) {
        throw new AppError(httpStatus.BAD_REQUEST, "You can only accept a ride that is in requested status");
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
        await agenda.cancel({ name: "checkPendingRide", "data.rideId": ride._id.toString()});
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
    acceptRide
};