import { envVars } from "../config/env";
import AppError from "../errorHelpers/AppError";
import { IsActive, IUser } from "../modules/user/user.interface";
import { User } from "../modules/user/user.model";
import { generateToken, verifyToken } from "./jwt";
import httpStatus from "http-status-codes";

export const createUserToken=(user:Partial<IUser>)=>{
    const payload={
        userId:user._id,
        email:user.email,
        role:user.role
    }
    const accessToken=generateToken(payload,envVars.JWT_ACCESS_SECRET,envVars.JWT_ACCESS_EXPIRES_IN);
    const refreshToken=generateToken(payload,envVars.JWT_REFRESH_SECRET,envVars.JWT_REFRESH_EXPIRES_IN);
    return {
        accessToken,
        refreshToken
    }
}

export const createUserRefreshToken=async(refreshToken:string)=>{
    const verifiedRefreshToken=verifyToken(refreshToken,envVars.JWT_REFRESH_SECRET);
    if(!verifiedRefreshToken){
        throw new AppError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
    }
    const userExist=await User.findOne({email: verifiedRefreshToken.email});
    if(!userExist){
        throw new AppError(httpStatus.UNAUTHORIZED, "User does not exist");
    }
    if(userExist.isActive===IsActive.BLOCKED || userExist.isActive===IsActive.INACTIVE ){
        throw new AppError(httpStatus.UNAUTHORIZED, `User is ${userExist.isActive}`);
    }
    if(userExist.isDeleted){
        throw new AppError(httpStatus.UNAUTHORIZED, "User is deleted");
    }
    const JwtPayload={
        userId: userExist._id,
        email: userExist.email,
        role: userExist.role
    }
    const newAccessToken=generateToken(JwtPayload, envVars.JWT_ACCESS_SECRET, envVars.JWT_ACCESS_EXPIRES_IN);
    return newAccessToken;

}