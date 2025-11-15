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
exports.RideController = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const sendResponse_1 = require("../../utils/sendResponse");
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const ride_service_1 = require("./ride.service");
const ride_interface_1 = require("./ride.interface");
const socket_1 = require("../../utils/socket");
const createRide = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const ride = yield ride_service_1.RideService.createRide(req.body, req.user);
    // emitRideUpdate(ride._id.toString(), ride);
    if (ride && ride.status === 'PENDING') {
        (0, sendResponse_1.sendResponse)(res, {
            statusCode: http_status_codes_1.default.OK,
            message: "No drivers are available at the moment. Your ride request is pending. We will notify you once a driver becomes available.",
            success: true,
            data: ride
        });
        return;
    }
    (0, socket_1.emitToDriverThatHeHasNewRideRequest)((ride === null || ride === void 0 ? void 0 : ride.driver) && typeof ride.driver === 'object' && 'user' in ride.driver
        ? ride.driver.user.toString()
        : '', ride);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.CREATED,
        message: "Ride created successfully.Waiting for driver to accept the ride.",
        success: true,
        data: ride
    });
}));
const rideStatusChangeAfterRideAccepted = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const rideId = req.params.rideId;
    const { status } = req.body;
    const ride = yield ride_service_1.RideService.rideStatusChangeAfterRideAccepted(rideId, status, req.user);
    (0, socket_1.emitStatusChange)(rideId, status, req.user.userId);
    if (ride) {
        (0, socket_1.emitRideUpdate)(rideId, ride);
    }
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `Ride status updated to ${status} successfully`,
        success: true,
        data: ride
    });
}));
const cancelRide = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const rideId = req.params.rideId;
    const { canceledReason } = req.body;
    const ride = yield ride_service_1.RideService.canceledRide(rideId, canceledReason, req.user);
    (0, socket_1.emitStatusChange)(rideId, (_a = ride === null || ride === void 0 ? void 0 : ride.status) !== null && _a !== void 0 ? _a : '', req.user.userId);
    if (((_c = (_b = ride === null || ride === void 0 ? void 0 : ride.driver) === null || _b === void 0 ? void 0 : _b.activeRide) === null || _c === void 0 ? void 0 : _c.toString()) !== rideId) {
        (0, socket_1.emitToDriverThatRideHasBeenCancelledOrTimeOut)((_e = (_d = ride === null || ride === void 0 ? void 0 : ride.driver) === null || _d === void 0 ? void 0 : _d.user) === null || _e === void 0 ? void 0 : _e.toString(), rideId);
    }
    else {
        if (ride) {
            (0, socket_1.emitRideUpdate)(rideId, ride);
        }
    }
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `Ride cancelled successfully`,
        success: true,
        data: ride
    });
}));
const getAllRides = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const rides = yield ride_service_1.RideService.getAllRides();
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `All rides fetched successfully`,
        success: true,
        data: rides
    });
}));
const getRideHistory = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.userId;
    const rides = yield ride_service_1.RideService.getRideHistory(userId, req.user, req.query);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `Ride history fetched successfully`,
        success: true,
        data: rides
    });
}));
const getSingleRideDetails = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const rideId = req.params.rideId;
    const ride = yield ride_service_1.RideService.getSingleRideDetails(rideId, req.user);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `Ride details fetched successfully`,
        success: true,
        data: ride
    });
}));
const rejectRide = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const rideId = req.params.rideId;
    const ride = yield ride_service_1.RideService.rejectRide(rideId, req.user);
    (0, socket_1.emitRideUpdate)(rideId, ride);
    if (!ride.driver) {
        (0, sendResponse_1.sendResponse)(res, {
            statusCode: http_status_codes_1.default.OK,
            message: `Ride rejected successfully. No other drivers available. Ride is now pending.`,
            success: true,
            data: ride
        });
        return;
    }
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `Ride rejected successfully. New driver assigned.`,
        success: true,
        data: ride
    });
}));
const acceptRide = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const rideId = req.params.rideId;
    const ride = yield ride_service_1.RideService.acceptRide(rideId, req.user);
    (0, socket_1.emitStatusChange)(rideId, ride_interface_1.RideStatus.ACCEPTED, req.user.userId);
    if (ride) {
        (0, socket_1.emitRideUpdate)(rideId, ride);
    }
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `Ride accepted successfully.`,
        success: true,
        data: ride
    });
}));
const createFeedback = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const rideId = req.params.rideId;
    const { feedback } = req.body;
    const ride = yield ride_service_1.RideService.createFeedback(rideId, feedback, req.user);
    // Emit feedback update
    (0, socket_1.emitRideUpdate)(rideId, ride);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `Feedback submitted successfully.`,
        success: true,
        data: ride
    });
}));
const getActiveRide = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const ride = yield ride_service_1.RideService.getActiveRide(req.user);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `Active ride fetched successfully.`,
        success: true,
        data: ride
    });
}));
const getApproximateFare = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { pickupLocation, dropoffLocation } = req.query;
    console.log(pickupLocation);
    const pickupCoords = {
        type: "Point",
        coordinates: pickupLocation.split(',').map(Number) // [longitude, latitude]
    };
    const dropCoords = {
        type: "Point",
        coordinates: dropoffLocation.split(',').map(Number) // [longitude, latitude]
    };
    const fare = yield ride_service_1.RideService.getApproximateFare(pickupCoords, dropCoords);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `Approximate fare calculated successfully.`,
        success: true,
        data: { approximateFare: fare }
    });
}));
const getTotalRidesCount = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.userId;
    const totalRides = yield ride_service_1.RideService.getTotalRidesCount(userId, req.user);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `Total rides count fetched successfully.`,
        success: true,
        data: totalRides
    });
}));
const getIncomingRideRequests = (0, catchAsync_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const allIncomingRides = yield ride_service_1.RideService.getIncomingRideRequests(req.user);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: `Incoming ride requests fetched successfully.`,
        success: true,
        data: allIncomingRides
    });
}));
exports.RideController = {
    createRide,
    rideStatusChangeAfterRideAccepted,
    cancelRide,
    getRideHistory,
    getSingleRideDetails,
    getAllRides,
    rejectRide,
    acceptRide,
    createFeedback,
    getActiveRide,
    getApproximateFare,
    getTotalRidesCount,
    getIncomingRideRequests
};
