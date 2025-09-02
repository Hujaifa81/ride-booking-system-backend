import { JwtPayload } from "jsonwebtoken";
import AppError from "../errorHelpers/AppError";
import { Driver } from "../modules/driver/driver.model";
import { RideStatus } from "../modules/ride/ride.interface";
import { Ride } from "../modules/ride/ride.model";
import httpStatus from "http-status-codes";
import { DriverStatus } from "../modules/driver/driver.interface";
import { driverEarningCalculation, finalFareCalculation, PenaltyFareForExceedingTime } from "./fareCalculation";
import { Role } from "../modules/user/user.interface";




export const goingToPickup = async (rideId: string, token: JwtPayload) => {

    const ride = await Ride.findById(rideId);

    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }

    if (!ride.driver) {
        throw new AppError(httpStatus.NOT_FOUND, "Driver not assigned to this ride yet");
    }

    if (token.role === Role.ADMIN) {
        ride.status = RideStatus.GOING_TO_PICK_UP;
        ride.statusHistory.push({
            status: RideStatus.GOING_TO_PICK_UP,
            by: token.userId,
            timestamp: new Date()
        })
        await ride.save();

        return ride;

    }

    if (!token.role || token.role !== 'DRIVER') {
        throw new AppError(httpStatus.UNAUTHORIZED, "Drivers can pick up rides.");
    }

    const driver = await Driver.findOne({ user: token.userId });

    if (!driver) {
        throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
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
    const ride = await Ride.findById(rideId);

    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }

    if (!ride.driver) {
        throw new AppError(httpStatus.NOT_FOUND, "Driver not assigned to this ride yet");
    }

    if (token.role === Role.ADMIN) {
        ride.status = RideStatus.DRIVER_ARRIVED;
        ride.statusHistory.push({
            status: RideStatus.DRIVER_ARRIVED,
            by: token.userId,
            timestamp: new Date()
        })
        await ride.save();
        return ride;
    }

    if (!token.role || token.role !== 'DRIVER') {
        throw new AppError(httpStatus.UNAUTHORIZED, "Drivers can mark rides as arrived.");
    }

    const driver = await Driver.findOne({ user: token.userId });


    if (!driver) {
        throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
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

    const ride = await Ride.findById(rideId);
    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }

    if (!ride.driver) {
        throw new AppError(httpStatus.NOT_FOUND, "Driver not assigned to this ride yet");
    }

    if (token.role === Role.ADMIN) {
        ride.status = RideStatus.IN_TRANSIT;
        ride.statusHistory.push({
            status: RideStatus.IN_TRANSIT,
            by: token.userId,
            timestamp: new Date()
        })
        await ride.save();
        return ride;
    }


    if (!token.role || token.role !== 'DRIVER') {
        throw new AppError(httpStatus.UNAUTHORIZED, "Drivers can mark rides as in transit.");
    }

    const driver = await Driver.findOne({ user: token.userId });


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

    const ride = await Ride.findById(rideId);
    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }

    if (!ride.driver) {
        throw new AppError(httpStatus.NOT_FOUND, "Driver not assigned to this ride yet");
    }

    if (token.role === Role.ADMIN) {
        ride.status = RideStatus.REACHED_DESTINATION;
        ride.statusHistory.push({
            status: RideStatus.REACHED_DESTINATION,
            by: token.userId,
            timestamp: new Date()
        })
        await ride.save();
        return ride;
    }

    if (!token.role || token.role !== 'DRIVER') {
        throw new AppError(httpStatus.UNAUTHORIZED, "Only drivers can mark rides as reached destination.");
    }

    const driver = await Driver.findOne({ user: token.userId });


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
    const ride = await Ride.findById(rideId);

    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }

    if (!ride.driver) {
        throw new AppError(httpStatus.NOT_FOUND, "Driver not assigned to this ride yet");
    }

    if (token.role === Role.ADMIN) {
        const driver = await Driver.findOne({ user: ride.driver });
        if (driver) {
            if (driver.activeRide && String(driver.activeRide) === String(ride._id)) {
                driver.activeRide = null;
                if (driver.status === DriverStatus.ON_TRIP) {
                    driver.status = DriverStatus.AVAILABLE;
                }
            }

            const driverEarning = driverEarningCalculation(ride.finalFare as number);
            driver.earnings = Number(driver.earnings) + driverEarning;
            await driver.save();
        }
        ride.status = RideStatus.COMPLETED;
        ride.statusHistory.push({
            status: RideStatus.COMPLETED,
            by: token.userId,
            timestamp: new Date()
        })
        await ride.save();

        return ride;
    }
    if (!token.role || token.role !== 'DRIVER') {
        throw new AppError(httpStatus.UNAUTHORIZED, "Only drivers can mark rides as completed.");
    }

    const driver = await Driver.findOne({ user: token.userId });


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
    // driver.location = ride.dropOffLocation;

    await driver.save();

    return ride;
}

export const cancelRide = async (rideId: string, canceledReason: string, token: JwtPayload) => {

    const ride = await Ride.findById(rideId);

    if (!ride) {
        throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
    }

    if (token.role === Role.ADMIN) {
        if (ride.status === RideStatus.CANCELLED_BY_DRIVER || ride.status === RideStatus.CANCELLED_BY_RIDER || ride.status === RideStatus.CANCELLED_BY_ADMIN || ride.status === RideStatus.CANCELLED_FOR_PENDING_TIME_OVER) {
            throw new AppError(httpStatus.BAD_REQUEST, "This ride has already been canceled.");
        }
        if (ride.status === RideStatus.COMPLETED) {
            throw new AppError(httpStatus.BAD_REQUEST, "You cannot cancel a completed ride.");
        }

        ride.status = RideStatus.CANCELLED_BY_ADMIN;
        ride.canceledReason = canceledReason;
        ride.statusHistory.push({
            status: RideStatus.CANCELLED_BY_ADMIN,
            by: token.userId,
            timestamp: new Date()
        })
        await ride.save();

        const driver = await Driver.findOne({ user: ride.driver });

        if (ride.driver && driver && driver.activeRide && String(driver.activeRide) === String(ride._id)) {
            if (driver.activeRide && String(driver.activeRide) === String(ride._id)) {
                driver.activeRide = null;
                if (driver.status === DriverStatus.ON_TRIP) {
                    driver.status = DriverStatus.AVAILABLE;
                }
                await driver.save();
            }
        }
        return ride;
    }

    const driver = await Driver.findOne({ user: token.userId });

    if (token.role === Role.DRIVER) {
        if (!driver) {
            throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
        }
        if (String(driver._id) !== String(ride.driver)) {
            throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to cancel this ride.");
        }
        if (ride.status === RideStatus.CANCELLED_BY_DRIVER || ride.status === RideStatus.CANCELLED_BY_RIDER || ride.status === RideStatus.CANCELLED_BY_ADMIN || ride.status === RideStatus.CANCELLED_FOR_PENDING_TIME_OVER) {
            throw new AppError(httpStatus.BAD_REQUEST, "This ride has already been canceled.");
        }

        if (ride.status === RideStatus.REQUESTED) {
            throw new AppError(httpStatus.BAD_REQUEST, "You cannot cancel a ride that is in REQUESTED status.First accept the ride.");
        }

        if (ride.status === RideStatus.COMPLETED) {
            throw new AppError(httpStatus.BAD_REQUEST, "You cannot cancel a completed ride.");
        }
        if (ride.status === RideStatus.REACHED_DESTINATION) {
            throw new AppError(httpStatus.BAD_REQUEST, "You cannot cancel a ride that has reached the destination.");
        }
        if (ride.status === RideStatus.IN_TRANSIT) {
            throw new AppError(httpStatus.BAD_REQUEST, "You cannot cancel a ride that is in transit.");
        }
        ride.status = RideStatus.CANCELLED_BY_DRIVER;
        ride.canceledReason = canceledReason;
        ride.statusHistory.push({
            status: RideStatus.CANCELLED_BY_DRIVER,
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

    if (token.role === Role.RIDER) {
        if (String(ride.user) !== token.userId) {
            throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to cancel this ride.");
        }
        if (ride.status === RideStatus.CANCELLED_BY_DRIVER || ride.status === RideStatus.CANCELLED_BY_RIDER || ride.status === RideStatus.CANCELLED_BY_ADMIN || ride.status === RideStatus.CANCELLED_FOR_PENDING_TIME_OVER) {
            throw new AppError(httpStatus.BAD_REQUEST, "This ride has already been canceled.");
        }
        if (ride.status === RideStatus.COMPLETED) {
            throw new AppError(httpStatus.BAD_REQUEST, "You cannot cancel a completed ride.");
        }
        if (ride.status === RideStatus.REACHED_DESTINATION) {
            throw new AppError(httpStatus.BAD_REQUEST, "You cannot cancel a ride that has reached the destination.");
        }
        if (ride.status === RideStatus.IN_TRANSIT) {
            throw new AppError(httpStatus.BAD_REQUEST, "You cannot cancel a ride that is in transit.");
        }
        ride.status = RideStatus.CANCELLED_BY_RIDER;
        ride.canceledReason = canceledReason;
        ride.statusHistory.push({
            status: RideStatus.CANCELLED_BY_RIDER,
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


}