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
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const agenda_1 = require("../agenda");
const ride_model_1 = require("../../modules/ride/ride.model");
const ride_interface_1 = require("../../modules/ride/ride.interface");
const findNearestAvailableDriver_1 = require("../../utils/findNearestAvailableDriver");
const vehicle_model_1 = require("../../modules/vehicle/vehicle.model");
const socket_1 = require("../../utils/socket");
const user_model_1 = require("../../modules/user/user.model");
const user_interface_1 = require("../../modules/user/user.interface");
agenda_1.agenda.define("driverResponseTimeout", (job) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { rideId, driverId } = job.attrs.data;
    const ride = yield ride_model_1.Ride.findById(rideId).populate("driver").populate("user");
    // Compare as strings to avoid ObjectId mismatch
    const rideDriverId = (_b = (_a = ride === null || ride === void 0 ? void 0 : ride.driver) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    const expectedDriverId = String(driverId);
    if (!ride ||
        ride.status !== ride_interface_1.RideStatus.REQUESTED ||
        rideDriverId !== expectedDriverId) {
        return;
    }
    console.log(`[driverResponseTimeout] Timeout! Driver ${driverId} did not respond. Finding new driver...`);
    // Emit timeout message to driver
    const driverUser = ride.driver.user;
    (0, socket_1.emitToDriverThatRideHasBeenCancelledOrTimeOut)(driverUser.toString(), rideId);
    // Remove current driver and find a new one
    if (ride.driver && ride.driver._id) {
        ride.rejectedDrivers.push(ride.driver._id);
    }
    ride.driver = null;
    ride.vehicle = null;
    yield ride.save();
    // Cancel timeout job for this driver
    yield agenda_1.agenda.cancel({
        name: "driverResponseTimeout",
        "data.rideId": rideId,
        "data.driverId": driverId,
    });
    const newDriver = yield (0, findNearestAvailableDriver_1.findNearestAvailableDriver)(rideId);
    if (newDriver) {
        console.log(`[driverResponseTimeout] Found new driver ${newDriver._id}`);
        ride.driver = newDriver._id;
        const activeVehicle = yield vehicle_model_1.Vehicle.findOne({ user: newDriver.user, isActive: true });
        ride.vehicle = activeVehicle === null || activeVehicle === void 0 ? void 0 : activeVehicle._id;
        yield ride.save();
        // Schedule timeout for new driver
        yield agenda_1.agenda.schedule("5 minutes", "driverResponseTimeout", {
            rideId: rideId,
            driverId: newDriver._id.toString(),
        });
        // Notify new driver
        const rideWithDriver = yield ride_model_1.Ride.findById(rideId).populate("driver").populate("user");
        (0, socket_1.emitToDriverThatHeHasNewRideRequest)(newDriver.user.toString(), rideWithDriver);
    }
    else {
        console.log(`[driverResponseTimeout] No new driver found. Setting ride to PENDING`);
        ride.status = ride_interface_1.RideStatus.PENDING;
        ride.statusHistory.push({
            status: ride_interface_1.RideStatus.PENDING,
            timestamp: new Date(),
            by: "SYSTEM",
        });
        yield ride.save();
        // Start repeating job to retry every 30 seconds
        yield agenda_1.agenda.every("30 seconds", "checkPendingRide", { rideId: rideId });
    }
}));
agenda_1.agenda.define("checkPendingRide", (job) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("[checkPendingRide] Job started for rideId:", job.attrs.data.rideId);
    const { rideId } = job.attrs.data;
    const ride = yield ride_model_1.Ride.findById(rideId);
    if (!ride || ride.status !== ride_interface_1.RideStatus.PENDING) {
        console.log("[checkPendingRide] Ride not in PENDING status or not found");
        yield agenda_1.agenda.cancel({ name: "checkPendingRide", "data.rideId": rideId });
        return;
    }
    const now = Date.now();
    const createdAt = new Date(ride.createdAt).getTime();
    // Cancel ride if pending > 10 minute from creation
    if (now - createdAt >= 10 * 60 * 1000) {
        ride.status = ride_interface_1.RideStatus.CANCELLED_FOR_PENDING_TIME_OVER;
        ride.driver = null;
        ride.vehicle = null;
        ride.canceledReason = 'No drivers available';
        ride.statusHistory.push({
            status: ride_interface_1.RideStatus.CANCELLED_FOR_PENDING_TIME_OVER,
            timestamp: new Date(),
            by: 'SYSTEM'
        });
        yield ride.save();
        (0, socket_1.emitStatusChange)(rideId, ride_interface_1.RideStatus.CANCELLED_FOR_PENDING_TIME_OVER, ride.user.toString());
        yield agenda_1.agenda.cancel({ name: "checkPendingRide", "data.rideId": ride._id.toString() });
        yield agenda_1.agenda.cancel({ name: "driverResponseTimeout", "data.rideId": ride._id.toString() });
        console.log(`Ride ${rideId} cancelled after 10 mins`);
        return;
    }
    const newDriver = yield (0, findNearestAvailableDriver_1.findNearestAvailableDriver)(rideId);
    if (newDriver) {
        console.log(`[checkPendingRide] Found driver ${newDriver._id}`);
        ride.driver = newDriver._id;
        ride.status = ride_interface_1.RideStatus.REQUESTED;
        const activeVehicle = yield vehicle_model_1.Vehicle.findOne({ user: newDriver.user, isActive: true });
        ride.vehicle = activeVehicle === null || activeVehicle === void 0 ? void 0 : activeVehicle._id;
        yield ride.save();
        // Cancel the repeating job
        yield agenda_1.agenda.cancel({ name: "checkPendingRide", "data.rideId": rideId });
        // Schedule timeout for this driver
        yield agenda_1.agenda.schedule("5 minutes", "driverResponseTimeout", {
            rideId: rideId,
            driverId: newDriver._id.toString(),
        });
        // Notify driver
        const rideWithDriver = yield ride_model_1.Ride.findById(rideId).populate("driver").populate("user");
        (0, socket_1.emitToDriverThatHeHasNewRideRequest)(newDriver.user.toString(), rideWithDriver);
    }
    else {
        console.log("[checkPendingRide] No driver available yet, will retry in 30 seconds");
    }
}));
// when user is blocked for 3 time cancellation in a day, unblock after 24 hours
agenda_1.agenda.define("unblockUserAfter24Hours", (job) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = job.attrs.data;
    const user = yield user_model_1.User.findById(userId);
    if (user && user.isActive === user_interface_1.IsActive.BLOCKED) {
        user.isActive = user_interface_1.IsActive.ACTIVE;
        yield user.save();
        console.log(`User ${userId} has been unblocked after 24 hours`);
        yield agenda_1.agenda.cancel({ name: "unblockUserAfter24Hours", "data.userId": userId });
    }
}));
