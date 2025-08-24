/* eslint-disable @typescript-eslint/no-unused-vars */
import { JwtPayload } from "jsonwebtoken";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { NextFunction, Request, Response } from "express";
import httpStatus from 'http-status-codes';
import { RideService } from "./ride.service";

const createRide=catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const ride = await RideService.createRide(req.body, req.user as JwtPayload);
    
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        message: "Ride created successfully",
        success: true,
        data: ride
    });
})

const rideStatusChange=catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const rideId=req.params.rideId;
    const { status }=req.body;
    const ride=await RideService.rideStatusChange(rideId,status,req.user as JwtPayload);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Ride status updated to ${status} successfully`,
        success: true,
        data: ride
    });
})

const cancelRide=catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const rideId=req.params.rideId;
    const {canceledReason}=req.body;
    console.log(canceledReason);
    const ride=await RideService.canceledRide(rideId,canceledReason,req.user as JwtPayload);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Ride cancelled successfully`,
        success: true,
        data: ride
    });
})

export const RideController = {
    createRide,
    rideStatusChange,
    cancelRide
}