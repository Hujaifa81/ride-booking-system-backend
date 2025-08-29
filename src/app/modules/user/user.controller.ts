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
const getAllUsers=catchAsync(async(req:Request, res:Response, next:NextFunction) => {
    const users=await UserService.getAllUsers();
    sendResponse(res,{
        statusCode:httpStatus.OK,
        message:"Users fetched successfully",
        success:true,
        data:users
    }) 
})
const isActiveChange=catchAsync(async(req:Request, res:Response, next:NextFunction) => {
    const userId=req.params.userId;
    const {isActive}=req.body;
    const user=await UserService.isActiveChange(userId,isActive);
    sendResponse(res,{
        statusCode:httpStatus.OK,
        message:`User is now ${isActive}`,
        success:true,
        data:user
    })
})
const updateUserRole=catchAsync(async(req:Request, res:Response, next:NextFunction) => {
    const userId=req.params.userId;
    const {role}=req.body;
    const user=await UserService.updateUserRole(userId,role);
    sendResponse(res,{
        statusCode:httpStatus.OK,
        message:`User role updated to ${role} successfully`,
        success:true,
        data:user
    })
})
export const userController = {
    register,
    getAllUsers,
    isActiveChange,
    updateUserRole

}