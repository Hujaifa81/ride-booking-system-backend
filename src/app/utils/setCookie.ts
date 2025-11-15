import { Response } from "express";
import { envVars } from "../config/env";

export interface ITokenInfo {
    accessToken?: string;
    refreshToken?: string;
}

export const setCookie = (res: Response, tokenInfo: ITokenInfo) => {
    const cookieOptions = {
        httpOnly: true,
        secure: envVars.NODE_ENV === 'production',
        sameSite: envVars.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/', // ADDED: explicit path
    } as const;

    if (tokenInfo.accessToken) {
        res.cookie("accessToken", tokenInfo.accessToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
    }
    
    if (tokenInfo.refreshToken) {
        res.cookie("refreshToken", tokenInfo.refreshToken, {
            ...cookieOptions,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
    }
};