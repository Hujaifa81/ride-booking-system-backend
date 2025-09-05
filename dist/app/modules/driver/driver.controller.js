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
exports.driverController = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const sendResponse_1 = require("../../utils/sendResponse");
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const driver_service_1 = require("./driver.service");
const userToken_1 = require("../../utils/userToken");
const setCookie_1 = require("../../utils/setCookie");
const createDriver = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const driver = yield driver_service_1.DriverService.createDriver(req.body, req.user);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.CREATED,
        message: "Driver created successfully.Waiting for admin approval.",
        success: true,
        data: driver
    });
}));
const getAllDrivers = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield driver_service_1.DriverService.getAllDrivers(req.query);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: "Drivers fetched successfully",
        success: true,
        data: result
    });
}));
const driverApprovedStatusChange = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const driverId = req.params.driverId;
    const { driver, user } = yield driver_service_1.DriverService.driverApprovedStatusChange(driverId);
    if (user) {
        const tokenInfo = (0, userToken_1.createUserToken)(user);
        (0, setCookie_1.setCookie)(res, tokenInfo);
    }
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `Driver status updated to ${user === null || user === void 0 ? void 0 : user.role} successfully.Sign in again for new token.`,
        success: true,
        data: driver
    });
}));
const driverStatusChange = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { status } = req.body;
    const driver = yield driver_service_1.DriverService.driverStatusChange(status, req.user);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `Driver status updated to successfully.`,
        success: true,
        data: driver
    });
}));
const driverLocationUpdate = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { location } = req.body;
    const driver = yield driver_service_1.DriverService.driverLocationUpdate(location, req.user);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `Driver location updated successfully.`,
        success: true,
        data: driver
    });
}));
const getDriverEarningsHistory = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const driverId = req.params.driverId;
    const earningsHistory = yield driver_service_1.DriverService.getDriverEarningsHistory(driverId, req.user);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `Driver earnings history fetched successfully.`,
        success: true,
        data: earningsHistory
    });
}));
const driverSuspendedStatusChange = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const driverId = req.params.driverId;
    const { isSuspended } = req.body;
    const driver = yield driver_service_1.DriverService.driverSuspendedStatusChange(driverId, isSuspended);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `Driver is now ${isSuspended ? 'suspended' : 'active'}`,
        success: true,
        data: driver
    });
}));
const updateDriverRating = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const driverId = req.params.driverId;
    const { rating, rideId } = req.body;
    const result = yield driver_service_1.DriverService.updateDriverRating(driverId, rating, rideId, req.user);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `Driver rated successfully`,
        success: true,
        data: result
    });
}));
exports.driverController = {
    createDriver,
    getAllDrivers,
    driverApprovedStatusChange,
    driverStatusChange,
    driverLocationUpdate,
    getDriverEarningsHistory,
    driverSuspendedStatusChange,
    updateDriverRating
};
