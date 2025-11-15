/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import AppError from "../../errorHelpers/AppError";
import httpStatus from "http-status-codes";
import { createUserToken } from "../../utils/userToken";
import { setCookie } from "../../utils/setCookie";
import { envVars } from "../../config/env";
import { sendResponse } from "../../utils/sendResponse";
import { authService } from "./auth.service";
import { JwtPayload } from "jsonwebtoken";
import passport from "passport";

const googleCallback = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    let redirectUrl = req.query.state ? req.query.state as string : '';

    if (redirectUrl.startsWith('/')) {
        redirectUrl = redirectUrl.slice(1);
    }
    const user = req.user;
    if (!user) {
        throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }
    // Clear any existing cookies before setting new ones
    const cookieOptions = {
        httpOnly: true,
        secure: envVars.NODE_ENV === 'production',
        sameSite: envVars.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
    } as const;

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    const tokenInfo = createUserToken(user);
    setCookie(res, tokenInfo);
    res.redirect(`${envVars.FRONTEND_URL}/${redirectUrl}`);
});

const credentialsLogin=catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local",(err:any,user:any,info:any)=>{
        if(err){
            return next(new AppError(httpStatus.INTERNAL_SERVER_ERROR,err));
        }
        if(!user){
            return next(new AppError(httpStatus.UNAUTHORIZED, info.message));
        }

        const tokenInfo=createUserToken(user)

        setCookie(res,tokenInfo);

        const {password:pass,...rest}=user.toObject();

        sendResponse(res,{
            success: true,
            statusCode: httpStatus.OK,
            message: "Login successful",
            data:{
                user: rest,
                accessToken: tokenInfo.accessToken,
                refreshToken: tokenInfo.refreshToken
            }
        })
    })(req, res, next);
})

const logout = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // Clear cookies with ALL possible domain/path combinations
    const cookieOptions = {
        httpOnly: true,
        secure: envVars.NODE_ENV === 'production',
        sameSite: envVars.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
    } as const;

    // Clear access token
    res.clearCookie("accessToken", cookieOptions);
    
    // Clear refresh token
    res.clearCookie("refreshToken", cookieOptions);
    
    // Clear session cookie if it exists
    res.clearCookie("connect.sid", cookieOptions);
    
    // Destroy express session
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error("Session destroy error:", err);
            }
        });
    }
    
    // Logout from passport
    if (req.logout) {
        req.logout((err) => {
            if (err) {
                console.error("Passport logout error:", err);
            }
        });
    }

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Logout successful",
        data: null
    });
});

const resetPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const newPassword = req.body.newPassword;
    const oldPassword = req.body.oldPassword;
    const decodedToken = req.user
    const data = await authService.resetPassword(oldPassword, newPassword, decodedToken as JwtPayload);
    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Password reset successfully",
        data: data
    })
})

const getNewAccessToken = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        throw new AppError(httpStatus.UNAUTHORIZED, "Refresh token is missing");
    }
    const tokenInfo=await authService.getNewAccessToken(refreshToken as string);

    setCookie(res, tokenInfo);
    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "New access token generated successfully",
        data: tokenInfo
    })
    
})
export const authController = {
    googleCallback,
    credentialsLogin,
    logout,
    resetPassword,
    getNewAccessToken
}
