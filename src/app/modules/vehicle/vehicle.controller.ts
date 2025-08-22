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

const activeVehicle=catchAsync(async(req:Request, res:Response, next:NextFunction) => {
    const vehicleId=req.params.vehicleId;
    
    const vehicle = await VehicleService.activeVehicle(vehicleId, req.user as JwtPayload);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        message: "Vehicle activated successfully",
        success: true,
        data: vehicle
    });
})
export const vehicleController = {
    createVehicle,
    activeVehicle
};