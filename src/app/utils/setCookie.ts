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
            secure: envVars.NODE_ENV === 'production'? true : false,
            sameSite: envVars.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })
    }
    if (tokenInfo.refreshToken) {
        res.cookie("refreshToken", tokenInfo.refreshToken, {
            httpOnly: true,
            secure: envVars.NODE_ENV === 'production'? true : false,
            sameSite: envVars.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000
        })
    }
}