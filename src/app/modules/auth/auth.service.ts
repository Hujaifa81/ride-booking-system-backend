import { JwtPayload } from "jsonwebtoken";
import { User } from "../user/user.model";
import { comparePassword, hashedPassword } from "../../utils/hashedPassword";
import AppError from "../../errorHelpers/AppError";
import httpStatus from "http-status-codes";
import { createUserRefreshToken } from "../../utils/userToken";

const resetPassword=async(oldPassword:string, newPassword:string, decodedToken:JwtPayload) =>{
    const user=await User.findById(decodedToken.userId);
    if(!user?.password){
        throw new AppError(httpStatus.BAD_REQUEST, "User does not have a password set.First set a password");
    }

    const isMatch=await comparePassword(oldPassword,user.password)
    if(!isMatch){
        throw new AppError(httpStatus.UNAUTHORIZED, "Old password does not match");
    }
    const hashedNewPassword=await hashedPassword(newPassword);

    user.password=hashedNewPassword;
    await user.save();
    return user;
    
}

const getNewAccessToken=async(refreshToken:string) => {
    const newAccessToken =await createUserRefreshToken(refreshToken);
    return {
        accessToken: newAccessToken
    }
}
export const authService={
    resetPassword,
    getNewAccessToken
}