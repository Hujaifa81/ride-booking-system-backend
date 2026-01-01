"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCookie = void 0;
const env_1 = require("../config/env");
const setCookie = (res, tokenInfo) => {
    const cookieOptions = {
        httpOnly: true,
        secure: env_1.envVars.NODE_ENV === 'production',
        sameSite: env_1.envVars.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/', // ADDED: explicit path
    };
    if (tokenInfo.accessToken) {
        res.cookie("accessToken", tokenInfo.accessToken, Object.assign(Object.assign({}, cookieOptions), { maxAge: 7 * 24 * 60 * 60 * 1000 }));
    }
    if (tokenInfo.refreshToken) {
        res.cookie("refreshToken", tokenInfo.refreshToken, Object.assign(Object.assign({}, cookieOptions), { maxAge: 30 * 24 * 60 * 60 * 1000 }));
    }
};
exports.setCookie = setCookie;
