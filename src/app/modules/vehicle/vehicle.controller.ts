/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from 'http-status-codes';
import { JwtPayload } from "jsonwebtoken";
import { VehicleService } from "./vehicle.service";

const createVehicle=catchAsync(async(req:Request, res:Response, next:NextFunction) => {
    const vehicle = await VehicleService.createVehicle(req.body, req.user as JwtPayload);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        message: "Vehicle created successfully",
        success: true,
        data: vehicle
    });
})

const getMyVehicles=catchAsync(async(req:Request, res:Response, next:NextFunction) => {
    const vehicles = await VehicleService.getMyVehicles(req.user as JwtPayload);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: "Vehicles fetched successfully",
        success: true,
        data: vehicles
    });
})

const activeVehicleStatusChange=catchAsync(async(req:Request, res:Response, next:NextFunction) => {
    const vehicleId=req.params.vehicleId;
    const vehicle = await VehicleService.activeVehicleStatusChange(vehicleId, req.user as JwtPayload);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: "Vehicle status changed successfully",
        success: true,
        data: vehicle
    });
})

export const vehicleController = {
    createVehicle,
    getMyVehicles,
    activeVehicleStatusChange
};