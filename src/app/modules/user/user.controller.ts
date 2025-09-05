/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { UserService } from "./user.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";

const register=catchAsync(async(req:Request, res:Response, next:NextFunction) => {
    const user=await UserService.createUser(req.body);
    sendResponse(res,{
        statusCode:httpStatus.CREATED,
        message:"User created successfully",
        success:true,
        data:user
    }) 
})
const getAllUsers=catchAsync(async(req:Request, res:Response, next:NextFunction) => {
    const users=await UserService.getAllUsers();
    sendResponse(res,{
        statusCode:httpStatus.OK,
        message:"Users fetched successfully",
        success:true,
        data:users
    }) 
})

const updateUser=catchAsync(async(req:Request, res:Response, next:NextFunction) => {
    const userId=req.params.userId;
    const user=await UserService.updateUser(userId,req.body,req.user as JwtPayload);
    sendResponse(res,{
        statusCode:httpStatus.OK,
        message:"User updated successfully",
        success:true,
        data:user
    }) 
})

export const userController = {
    register,
    getAllUsers,
    updateUser,
    

}