import { JwtPayload } from "jsonwebtoken";
import AppError from "../errorHelpers/AppError";
import { Driver } from "../modules/driver/driver.model";
import { RideStatus } from "../modules/ride/ride.interface";
import { Ride } from "../modules/ride/ride.model";
import { Vehicle } from "../modules/vehicle/vehicle.model";
import httpStatus from "http-status-codes";
import { DriverStatus } from "../modules/driver/driver.interface";


export const acceptRide = async (rideId: string,  token: JwtPayload) => {
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

    if (driver.status !== DriverStatus.AVAILABLE) {
        throw new AppError(httpStatus.BAD_REQUEST, "You cannot accept a ride while you are not available.");
    }

    if (driver.activeRide !== null) {
        throw new AppError(httpStatus.BAD_REQUEST, "You have an ongoing ride. Please complete or cancel the current ride before accepting a new one.");
    }

    if (ride.driver) {
        throw new AppError(httpStatus.BAD_REQUEST, "This ride has already been accepted by another driver.");
    }

    if (ride.status !== RideStatus.REQUESTED) {
        throw new AppError(httpStatus.BAD_REQUEST, `You cannot accept a ride with status ${ride.status}`);
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