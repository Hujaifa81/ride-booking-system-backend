import { JwtPayload } from "jsonwebtoken";
import AppError from "../errorHelpers/AppError";
import { Driver } from "../modules/driver/driver.model";
import { RideStatus } from "../modules/ride/ride.interface";
import { Ride } from "../modules/ride/ride.model";
import { Vehicle } from "../modules/vehicle/vehicle.model";
import httpStatus from "http-status-codes";
import { DriverStatus } from "../modules/driver/driver.interface";
import { driverEarningCalculation, finalFareCalculation, PenaltyFareForExceedingTime } from "./fareCalculation";


export const acceptRide = async (rideId: string, token: JwtPayload) => {

    if (!token.role || token.role !== 'DRIVER') {
        throw new AppError(httpStatus.UNAUTHORIZED, "Only drivers can accept rides.");
    }

    const driver = await Driver.findOne({ user: token.userId });
    const ride = await Ride.findById(rideId);
    const vehicles = await Vehicle.find({ user: token.userId });
    const activeVehicle = vehicles.find(vehicle => vehicle.isActive === true);

    if (!driver) {
        throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
    }

    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }

    if (driver.approved === false) {
        throw new AppError(httpStatus.UNAUTHORIZED, "You are not approved as a driver yet. Please wait for admin approval.");
    }

    if (ride.status !== RideStatus.REQUESTED) {
        throw new AppError(httpStatus.BAD_REQUEST, "You can only accept a ride that is in REQUESTED status.");
    }

    if (driver.status !== DriverStatus.AVAILABLE) {
        throw new AppError(httpStatus.BAD_REQUEST, "You cannot accept a ride while you are not available.");
    }

    if (driver.activeRide !== null) {
        throw new AppError(httpStatus.BAD_REQUEST, "You have an ongoing ride. Please complete or cancel the current ride before accepting a new one.");
    }

    if (ride.driver) {
        throw new AppError(httpStatus.BAD_REQUEST, "This ride has already been accepted by another driver.");
    }

    ride.driver = driver._id;
    driver.activeRide = ride._id;
    driver.status = DriverStatus.ON_TRIP;
    await driver.save();
    ride.status = RideStatus.ACCEPTED;
    ride.vehicle = activeVehicle && activeVehicle._id;
    ride.statusHistory.push({
        status: RideStatus.ACCEPTED,
        by: driver._id,
        timestamp: new Date()
    })
    await ride.save();

    return ride;

}

export const goingToPickup = async (rideId: string, token: JwtPayload) => {

    if (!token.role || token.role !== 'DRIVER') {
        throw new AppError(httpStatus.UNAUTHORIZED, "Only drivers can pick up rides.");
    }

    const driver = await Driver.findOne({ user: token.userId });
    const ride = await Ride.findById(rideId);

    if (!driver) {
        throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
    }

    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }

    if (String(driver._id) !== String(ride.driver)) {
        throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to pick up this ride.");
    }

    if (ride.status !== RideStatus.ACCEPTED) {
        throw new AppError(httpStatus.BAD_REQUEST, "You can only pick up a ride that is in ACCEPTED status.");
    }

    ride.status = RideStatus.GOING_TO_PICK_UP;
    ride.statusHistory.push({
        status: RideStatus.GOING_TO_PICK_UP,
        by: driver._id,
        timestamp: new Date()
    })
    await ride.save();

    return ride;

}

export const driverArrived = async (rideId: string, token: JwtPayload) => {
    if (!token.role || token.role !== 'DRIVER') {
        throw new AppError(httpStatus.UNAUTHORIZED, "Only drivers can mark rides as arrived.");
    }

    const driver = await Driver.findOne({ user: token.userId });
    const ride = await Ride.findById(rideId);

    if (!driver) {
        throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
    }

    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }

    if (String(driver._id) !== String(ride.driver)) {
        throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to mark this ride as arrived.");
    }

    if (ride.status !== RideStatus.GOING_TO_PICK_UP) {
        throw new AppError(httpStatus.BAD_REQUEST, "You can only mark a ride as arrived that is in GOING_TO_PICK_UP status.");
    }

    ride.status = RideStatus.DRIVER_ARRIVED;
    ride.statusHistory.push({
        status: RideStatus.DRIVER_ARRIVED,
        by: driver._id,
        timestamp: new Date()
    })
    await ride.save();

    return ride;

}

export const inTransitRide = async (rideId: string, token: JwtPayload) => {

    if (!token.role || token.role !== 'DRIVER') {
        throw new AppError(httpStatus.UNAUTHORIZED, "Only drivers can mark rides as in transit.");
    }

    const driver = await Driver.findOne({ user: token.userId });
    const ride = await Ride.findById(rideId);

    if (!driver) {
        throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
    }

    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }

    if (String(driver._id) !== String(ride.driver)) {
        throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to mark this ride as in transit.");
    }

    if (ride.status !== RideStatus.DRIVER_ARRIVED) {
        throw new AppError(httpStatus.BAD_REQUEST, "You can only mark a ride as in transit that is in PICKED_UP status.");
    }

    ride.status = RideStatus.IN_TRANSIT;
    ride.statusHistory.push({
        status: RideStatus.IN_TRANSIT,
        by: driver._id,
        timestamp: new Date()
    })
    await ride.save();

    return ride;

}

export const reachedDestinationRide = async (rideId: string, token: JwtPayload) => {

    if (!token.role || token.role !== 'DRIVER') {
        throw new AppError(httpStatus.UNAUTHORIZED, "Only drivers can mark rides as reached destination.");
    }

    const driver = await Driver.findOne({ user: token.userId });
    const ride = await Ride.findById(rideId);

    if (!driver) {
        throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
    }

    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }

    if (String(driver._id) !== String(ride.driver)) {
        throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to mark this ride as reached destination.");
    }

    if (ride.status !== RideStatus.IN_TRANSIT) {
        throw new AppError(httpStatus.BAD_REQUEST, "You can only mark a ride as reached destination that is in IN_TRANSIT status.");
    }
    ride.status = RideStatus.REACHED_DESTINATION;
    ride.statusHistory.push({
        status: RideStatus.REACHED_DESTINATION,
        by: driver._id,
        timestamp: new Date()
    })
    await ride.save();

    const startTime = ride.statusHistory.find(log => log.status === RideStatus.IN_TRANSIT)?.timestamp;
    const completedTime = ride.statusHistory.find(log => log.status === RideStatus.REACHED_DESTINATION)?.timestamp;
    const penaltyFare = PenaltyFareForExceedingTime(startTime as Date, completedTime as Date, ride.pickupLocation, ride.dropOffLocation);
    const finalFare = finalFareCalculation(ride.approxFare as number, penaltyFare);
    ride.finalFare = finalFare;
    await ride.save();
    return ride;
}

export const completedRide = async (rideId: string, token: JwtPayload) => {
    if (!token.role || token.role !== 'DRIVER') {
        throw new AppError(httpStatus.UNAUTHORIZED, "Only drivers can mark rides as completed.");
    }

    const driver = await Driver.findOne({ user: token.userId });
    const ride = await Ride.findById(rideId);

    if (!driver) {
        throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
    }

    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }

    if (String(driver._id) !== String(ride.driver)) {
        throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to mark this ride as completed.");
    }

    if (ride.status !== RideStatus.REACHED_DESTINATION) {
        throw new AppError(httpStatus.BAD_REQUEST, "You can only mark a ride as completed that is in REACHED_DESTINATION status.");
    }

    ride.status = RideStatus.COMPLETED;
    ride.statusHistory.push({
        status: RideStatus.COMPLETED,
        by: driver._id,
        timestamp: new Date()
    })
    await ride.save();

    driver.activeRide = null;
    driver.status = DriverStatus.AVAILABLE;

    const driverEarning = driverEarningCalculation(ride.finalFare as number);

    driver.earnings = Number(driver.earnings) + driverEarning;
    driver.location= ride.dropOffLocation;

    await driver.save();

    return ride;
}

export const cancelRide = async (rideId: string, canceledReason: string, token: JwtPayload) => {

    const ride = await Ride.findById(rideId);
    const driver = await Driver.findOne({ user: token.userId });

    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }

    if (token.role === 'DRIVER') {
        if (!driver) {
            throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
        }
        if (String(driver._id) !== String(ride.driver)) {
            throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to cancel this ride.");
        }
        if (ride.status === RideStatus.CANCELED_BY_DRIVER || ride.status === RideStatus.CANCELED_BY_RIDER || ride.status === RideStatus.CANCELED_BY_ADMIN) {
            throw new AppError(httpStatus.BAD_REQUEST, "This ride has already been canceled.");
        }
        if (ride.status === RideStatus.COMPLETED) {
            throw new AppError(httpStatus.BAD_REQUEST, "You cannot cancel a completed ride.");
        }
        if( ride.status === RideStatus.REACHED_DESTINATION) {
            throw new AppError(httpStatus.BAD_REQUEST, "You cannot cancel a ride that has reached the destination.");
        }
        if( ride.status === RideStatus.IN_TRANSIT) {
            throw new AppError(httpStatus.BAD_REQUEST, "You cannot cancel a ride that is in transit.");
        }
        ride.status = RideStatus.CANCELED_BY_DRIVER;
        ride.canceledReason = canceledReason;
        ride.statusHistory.push({
            status: RideStatus.CANCELED_BY_DRIVER,
            by: driver._id,
            timestamp: new Date()
        })
        await ride.save();

        if (driver.activeRide && String(driver.activeRide) === String(ride._id)) {
            driver.activeRide = null;
            driver.status = DriverStatus.AVAILABLE;
            await driver.save();
        }

        return ride;
    }

    if (token.role === 'RIDER') {
        if (String(ride.user) !== token.userId) {
            throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to cancel this ride.");
        }
        if (ride.status === RideStatus.CANCELED_BY_DRIVER || ride.status === RideStatus.CANCELED_BY_RIDER || ride.status === RideStatus.CANCELED_BY_ADMIN) {
            throw new AppError(httpStatus.BAD_REQUEST, "This ride has already been canceled.");
        }
        if (ride.status === RideStatus.COMPLETED) {
            throw new AppError(httpStatus.BAD_REQUEST, "You cannot cancel a completed ride.");
        }
        if( ride.status === RideStatus.REACHED_DESTINATION) {
            throw new AppError(httpStatus.BAD_REQUEST, "You cannot cancel a ride that has reached the destination.");
        }
        if( ride.status === RideStatus.IN_TRANSIT) {
            throw new AppError(httpStatus.BAD_REQUEST, "You cannot cancel a ride that is in transit.");
        }
        ride.status = RideStatus.CANCELED_BY_RIDER;
        ride.canceledReason = canceledReason;
        ride.statusHistory.push({
            status: RideStatus.CANCELED_BY_RIDER,
            by: ride.user,
            timestamp: new Date()
        })
        await ride.save();
        if (ride.driver && driver && driver.activeRide && String(driver.activeRide) === String(ride._id)) {
            driver.activeRide = null;
            driver.status = DriverStatus.AVAILABLE;
            await driver.save();
        }
        return ride;
    }

    if (token.role === 'ADMIN') {
        if (ride.status === RideStatus.CANCELED_BY_DRIVER || ride.status === RideStatus.CANCELED_BY_RIDER || ride.status === RideStatus.CANCELED_BY_ADMIN) {
            throw new AppError(httpStatus.BAD_REQUEST, "This ride has already been canceled.");
        }
        if (ride.status === RideStatus.COMPLETED) {
            throw new AppError(httpStatus.BAD_REQUEST, "You cannot cancel a completed ride.");
        }
        ride.status = RideStatus.CANCELED_BY_ADMIN;
        ride.canceledReason = canceledReason;
        ride.statusHistory.push({
            status: RideStatus.CANCELED_BY_ADMIN,
            by: token.userId,
            timestamp: new Date()
        })
        await ride.save();
        if (ride.driver && driver && driver.activeRide && String(driver.activeRide) === String(ride._id)) {
            driver.activeRide = null;
            driver.status = DriverStatus.AVAILABLE;
            await driver.save();
        }
        return ride;
    }
}