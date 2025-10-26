/* eslint-disable @typescript-eslint/no-unused-vars */
import { JwtPayload } from "jsonwebtoken";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { NextFunction, Request, Response } from "express";
import httpStatus from 'http-status-codes';
import { RideService } from "./ride.service";
import { RideStatus } from "./ride.interface";
import { emitRideUpdate, emitStatusChange } from "../../utils/socket";
import { ILocation } from "../driver/driver.interface";

const createRide = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const ride = await RideService.createRide(req.body, req.user as JwtPayload);
    // emitRideUpdate(ride._id.toString(), ride);
    if (ride.status === 'PENDING') {
        sendResponse(res, {
            statusCode: httpStatus.OK,
            message: "No drivers are available at the moment. Your ride request is pending. We will notify you once a driver becomes available.",
            success: true,
            data: ride
        });
        return;
    }

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        message: "Ride created successfully.Waiting for driver to accept the ride.",
        success: true,
        data: ride
    });
})

const rideStatusChangeAfterRideAccepted = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const rideId = req.params.rideId;
    const { status } = req.body;
    const ride = await RideService.rideStatusChangeAfterRideAccepted(rideId, status, req.user as JwtPayload);
    emitStatusChange(rideId, status, (req.user as JwtPayload).userId);
    if (ride) {
        emitRideUpdate(rideId, ride);
    }

    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Ride status updated to ${status} successfully`,
        success: true,
        data: ride
    });
})

const cancelRide = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const rideId = req.params.rideId;
    const { canceledReason } = req.body;
    console.log(canceledReason);
    const ride = await RideService.canceledRide(rideId, canceledReason, req.user as JwtPayload);
    emitStatusChange(rideId, ride?.status ?? '', (req.user as JwtPayload).userId);
    if (ride) {
        emitRideUpdate(rideId, ride);
    }

    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Ride cancelled successfully`,
        success: true,
        data: ride
    });
})

const getAllRides = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const rides = await RideService.getAllRides();
    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `All rides fetched successfully`,
        success: true,
        data: rides
    });
})

const getRideHistory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.userId;
    const rides = await RideService.getRideHistory(userId, req.user as JwtPayload, req.query as Record<string, string>);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Ride history fetched successfully`,
        success: true,
        data: rides
    });
}
)

const getSingleRideDetails = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const rideId = req.params.rideId;
    const ride = await RideService.getSingleRideDetails(rideId, req.user as JwtPayload);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Ride details fetched successfully`,
        success: true,
        data: ride
    });
})

const rejectRide = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const rideId = req.params.rideId;
    const ride = await RideService.rejectRide(rideId, req.user as JwtPayload);
    emitRideUpdate(rideId, ride);
    if (!ride.driver) {
        sendResponse(res, {
            statusCode: httpStatus.OK,
            message: `Ride rejected successfully. No other drivers available. Ride is now pending.`,
            success: true,
            data: ride
        });
        return;

    }
    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Ride rejected successfully. New driver assigned.`,
        success: true,
        data: ride
    });
})

const acceptRide = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const rideId = req.params.rideId;
    const ride = await RideService.acceptRide(rideId, req.user as JwtPayload);
    emitStatusChange(rideId, RideStatus.ACCEPTED, (req.user as JwtPayload).userId);
    if (ride) {
        emitRideUpdate(rideId, ride);
    }
    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Ride accepted successfully.`,
        success: true,
        data: ride
    });
})

const createFeedback = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const rideId = req.params.rideId;
    const { feedback } = req.body;
    const ride = await RideService.createFeedback(rideId, feedback, req.user as JwtPayload);
    // Emit feedback update
    emitRideUpdate(rideId, ride);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Feedback submitted successfully.`,
        success: true,
        data: ride
    });
})

const getActiveRideForRider = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as JwtPayload).userId;
    const ride = await RideService.getActiveRideForRider(userId);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Active ride fetched successfully.`,
        success: true,
        data: ride
    });
})

const getApproximateFare = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { pickupLocation, dropoffLocation } = req.query as { pickupLocation: string; dropoffLocation: string };
    console.log(pickupLocation);
    const pickupCoords = {
        type: "Point",
        coordinates: pickupLocation.split(',').map(Number) // [longitude, latitude]
    }
    const dropCoords = {
        type: "Point",
        coordinates: dropoffLocation.split(',').map(Number) // [longitude, latitude]
    }
    
    const fare = await RideService.getApproximateFare(pickupCoords as ILocation, dropCoords as ILocation);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Approximate fare calculated successfully.`,
        success: true,
        data: { approximateFare: fare }
    });
})
const getTotalRidesCount = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.userId;
    const totalRides = await RideService.getTotalRidesCount(userId, req.user as JwtPayload);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Total rides count fetched successfully.`,
        success: true,
        data: totalRides 
    });
})

export const RideController = {
    createRide,
    rideStatusChangeAfterRideAccepted,
    cancelRide,
    getRideHistory,
    getSingleRideDetails,
    getAllRides,
    rejectRide,
    acceptRide,
    createFeedback,
    getActiveRideForRider,
    getApproximateFare,
    getTotalRidesCount

}