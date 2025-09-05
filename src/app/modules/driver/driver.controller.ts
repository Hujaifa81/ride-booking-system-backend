/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from 'http-status-codes';
import { DriverService } from "./driver.service";
import { JwtPayload } from "jsonwebtoken";
import { createUserToken } from "../../utils/userToken";
import { setCookie } from "../../utils/setCookie";


const createDriver = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const driver = await DriverService.createDriver(req.body, req.user as JwtPayload);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        message: "Driver created successfully.Waiting for admin approval.",
        success: true,
        data: driver
    })
})

const getAllDrivers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const result = await DriverService.getAllDrivers(req.query as Record<string, string>);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: "Drivers fetched successfully",
        success: true,
        data: result
    })
})

const driverApprovedStatusChange = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const driverId = req.params.driverId;
    const { driver, user } = await DriverService.driverApprovedStatusChange(driverId);

    if (user) {
        const tokenInfo = createUserToken(user);
        setCookie(res, tokenInfo);
    }

    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Driver status updated to ${user?.role} successfully.Sign in again for new token.`,
        success: true,
        data: driver
    })
})

const driverStatusChange = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { status } = req.body;
   

    const driver=await DriverService.driverStatusChange(status,req.user as JwtPayload);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Driver status updated to successfully.`,
        success: true,
        data: driver
    })
})

const driverLocationUpdate = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const {location} = req.body;
   

    const driver = await DriverService.driverLocationUpdate(location,req.user as JwtPayload);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Driver location updated successfully.`,
        success: true,
        data: driver
    })
})

const getDriverEarningsHistory=catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const driverId = req.params.driverId;

    const earningsHistory = await DriverService.getDriverEarningsHistory(driverId,req.user as JwtPayload);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Driver earnings history fetched successfully.`,
        success: true,
        data: earningsHistory
    })
})

const driverSuspendedStatusChange=catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
    const driverId=req.params.driverId;
    const {isSuspended}=req.body;
    const driver=await DriverService.driverSuspendedStatusChange(driverId,isSuspended);
    sendResponse(res,{
        statusCode:httpStatus.OK,
        message:`Driver is now ${isSuspended ? 'suspended' : 'active'}`,
        success:true,
        data:driver
    })
})

const updateDriverRating=catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
    const driverId=req.params.driverId;
    const {rating,rideId}=req.body;
    const result=await DriverService.updateDriverRating(driverId,rating,rideId,req.user as JwtPayload);
    sendResponse(res,{
        statusCode:httpStatus.OK,
        message:`Driver rated successfully`,
        success:true,
        data:result
    })
})
export const driverController = {
    createDriver,
    getAllDrivers,
    driverApprovedStatusChange,
    driverStatusChange,
    driverLocationUpdate,
    getDriverEarningsHistory,
    driverSuspendedStatusChange,
    updateDriverRating
}