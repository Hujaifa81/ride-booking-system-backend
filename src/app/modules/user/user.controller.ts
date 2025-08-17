/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { UserService } from "./user.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status-codes";

const register=catchAsync(async(req:Request, res:Response, next:NextFunction) => {
    const user=await UserService.createUser(req.body);
    sendResponse(res,{
        statusCode:httpStatus.CREATED,
        message:"User created successfully",
        success:true,
        data:user
    }) 
})
export const userController = {
    register
}