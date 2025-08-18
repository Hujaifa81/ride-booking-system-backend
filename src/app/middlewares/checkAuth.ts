import { NextFunction, Request, Response } from "express";
import AppError from "../errorHelpers/AppError";
import httpStatus from "http-status-codes";
import { verifyToken } from "../utils/jwt";
import { envVars } from "../config/env";
import { JwtPayload } from "jsonwebtoken";
import { User } from "../modules/user/user.model";
import { IsActive } from "../modules/user/user.interface";

export const checkAuth=(...authRoles:string[])=>async (req: Request, res: Response, next: NextFunction) => {
    try{
        const accessToken=req.headers.authorization
        if(!accessToken){
            throw new AppError(httpStatus.UNAUTHORIZED, "Access token is missing");
        }
        const verifiedToken=verifyToken(accessToken,envVars.JWT_ACCESS_SECRET) as JwtPayload

        if(!verifiedToken){
            throw new AppError(httpStatus.UNAUTHORIZED, "Invalid access token");
        }

        const userExist=await User.findOne({email: verifiedToken.email})

        if(!userExist){
            throw new AppError(httpStatus.UNAUTHORIZED, "User does not exist");
        }
        if(userExist.isActive===IsActive.BLOCKED || userExist.isActive===IsActive.INACTIVE ){
            throw new AppError(httpStatus.UNAUTHORIZED, `User is ${userExist.isActive}`);
        }
        if(userExist.isDeleted){
            throw new AppError(httpStatus.UNAUTHORIZED, "User is deleted");
        }
        if(!authRoles.includes(verifiedToken.role)){
            throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to access this resource");
        }
        req.user=verifiedToken;
        next();
    } 
    catch(error) {
        next(error)
    }
}