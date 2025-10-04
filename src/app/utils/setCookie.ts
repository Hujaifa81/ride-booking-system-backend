import { Response } from "express";
import { envVars } from "../config/env";

export interface ITokenInfo {
    accessToken?: string;
    refreshToken?: string;
}

export const setCookie = (res: Response, tokenInfo: ITokenInfo) => {
    if (tokenInfo.accessToken) {
        res.cookie("accessToken", tokenInfo.accessToken, {
            httpOnly: true,
            secure: envVars.NODE_ENV === "production",
            sameSite:"lax"
        })
    }
    if(tokenInfo.refreshToken) {
        res.cookie("refreshToken", tokenInfo.refreshToken, {
            httpOnly: true,
            secure: envVars.NODE_ENV === "production",
            sameSite:"none"
        })
    }
}