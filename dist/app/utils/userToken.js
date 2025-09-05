"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserRefreshToken = exports.createUserToken = void 0;
const env_1 = require("../config/env");
const AppError_1 = __importDefault(require("../errorHelpers/AppError"));
const user_interface_1 = require("../modules/user/user.interface");
const user_model_1 = require("../modules/user/user.model");
const jwt_1 = require("./jwt");
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const createUserToken = (user) => {
    const payload = {
        userId: user._id,
        email: user.email,
        role: user.role
    };
    const accessToken = (0, jwt_1.generateToken)(payload, env_1.envVars.JWT_ACCESS_SECRET, env_1.envVars.JWT_ACCESS_EXPIRES_IN);
    const refreshToken = (0, jwt_1.generateToken)(payload, env_1.envVars.JWT_REFRESH_SECRET, env_1.envVars.JWT_REFRESH_EXPIRES_IN);
    return {
        accessToken,
        refreshToken
    };
};
exports.createUserToken = createUserToken;
const createUserRefreshToken = (refreshToken) => __awaiter(void 0, void 0, void 0, function* () {
    const verifiedRefreshToken = (0, jwt_1.verifyToken)(refreshToken, env_1.envVars.JWT_REFRESH_SECRET);
    if (!verifiedRefreshToken) {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "Invalid refresh token");
    }
    const userExist = yield user_model_1.User.findOne({ email: verifiedRefreshToken.email });
    if (!userExist) {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "User does not exist");
    }
    if (userExist.isActive === user_interface_1.IsActive.BLOCKED || userExist.isActive === user_interface_1.IsActive.INACTIVE) {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, `User is ${userExist.isActive}`);
    }
    if (userExist.isDeleted) {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "User is deleted");
    }
    const JwtPayload = {
        userId: userExist._id,
        email: userExist.email,
        role: userExist.role
    };
    const newAccessToken = (0, jwt_1.generateToken)(JwtPayload, env_1.envVars.JWT_ACCESS_SECRET, env_1.envVars.JWT_ACCESS_EXPIRES_IN);
    return newAccessToken;
});
exports.createUserRefreshToken = createUserRefreshToken;
