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
exports.authService = void 0;
const user_model_1 = require("../user/user.model");
const hashedPassword_1 = require("../../utils/hashedPassword");
const AppError_1 = __importDefault(require("../../errorHelpers/AppError"));
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const userToken_1 = require("../../utils/userToken");
const resetPassword = (oldPassword, newPassword, decodedToken) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findById(decodedToken.userId);
    if (!(user === null || user === void 0 ? void 0 : user.password)) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "User does not have a password set.First set a password");
    }
    const isMatch = yield (0, hashedPassword_1.comparePassword)(oldPassword, user.password);
    if (!isMatch) {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "Old password does not match");
    }
    const hashedNewPassword = yield (0, hashedPassword_1.hashedPassword)(newPassword);
    user.password = hashedNewPassword;
    yield user.save();
    return user;
});
const getNewAccessToken = (refreshToken) => __awaiter(void 0, void 0, void 0, function* () {
    const newAccessToken = yield (0, userToken_1.createUserRefreshToken)(refreshToken);
    return {
        accessToken: newAccessToken
    };
});
exports.authService = {
    resetPassword,
    getNewAccessToken
};
