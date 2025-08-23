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
        message: "Driver created successfully",
        success: true,
        data: driver
    })
})

const getAllDrivers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const drivers = await DriverService.getAllDrivers();
    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: "Drivers fetched successfully",
        success: true,
        data: drivers
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
    const driverId = req.params.driverId;
    const { status } = req.body;

    const driver=await DriverService.driverStatusChange(driverId,status,req.user as JwtPayload);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Driver status updated to successfully.`,
        success: true,
        data: driver
    })
})

const driverLocationUpdate = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const driverId = req.params.driverId;
    const location = req.body;

    const driver = await DriverService.driverLocationUpdate(driverId, location,req.user as JwtPayload);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: `Driver location updated successfully.`,
        success: true,
        data: driver
    })
})

export const driverController = {
    createDriver,
    getAllDrivers,
    driverApprovedStatusChange,
    driverStatusChange,
    driverLocationUpdate
}