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
exports.checkAuth = void 0;
const AppError_1 = __importDefault(require("../errorHelpers/AppError"));
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const jwt_1 = require("../utils/jwt");
const env_1 = require("../config/env");
const user_model_1 = require("../modules/user/user.model");
const user_interface_1 = require("../modules/user/user.interface");
const driver_model_1 = require("../modules/driver/driver.model");
const checkAuth = (...authRoles) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const accessToken = req.headers.authorization || ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.accessToken);
        if (!accessToken) {
            throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "Access token is missing");
        }
        const verifiedToken = (0, jwt_1.verifyToken)(accessToken, env_1.envVars.JWT_ACCESS_SECRET);
        if (!verifiedToken) {
            throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "Invalid access token");
        }
        const userExist = yield user_model_1.User.findOne({ email: verifiedToken.email });
        if (!userExist) {
            throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "User does not exist");
        }
        if (userExist.isActive === user_interface_1.IsActive.BLOCKED || userExist.isActive === user_interface_1.IsActive.INACTIVE) {
            throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, `User is ${userExist.isActive}`);
        }
        if (userExist.isDeleted) {
            throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "User is deleted");
        }
        if (!authRoles.includes(verifiedToken.role)) {
            throw new AppError_1.default(http_status_codes_1.default.FORBIDDEN, "You do not have permission to access this resource");
        }
        if (verifiedToken.role === user_interface_1.Role.DRIVER) {
            const driver = yield driver_model_1.Driver.findOne({ user: userExist._id });
            if (!(driver === null || driver === void 0 ? void 0 : driver.approved)) {
                throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "You are not approved as a driver yet. Please wait for admin approval.");
            }
            if (driver === null || driver === void 0 ? void 0 : driver.isSuspended) {
                throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "You are suspended as a driver. Please contact support.");
            }
        }
        req.user = verifiedToken;
        next();
    }
    catch (error) {
        next(error);
    }
});
exports.checkAuth = checkAuth;
