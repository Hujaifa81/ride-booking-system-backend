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
const ride_interface_1 = require("../../modules/ride/ride.interface");
const ride_model_1 = require("../../modules/ride/ride.model");
const user_interface_1 = require("../../modules/user/user.interface");
const user_model_1 = require("../../modules/user/user.model");
const vehicle_model_1 = require("../../modules/vehicle/vehicle.model");
const findNearestAvailableDriver_1 = require("../../utils/findNearestAvailableDriver");
const agenda_1 = require("../agenda");
// Define all jobs here (only once)
agenda_1.agenda.define("driverResponseTimeout", (job) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { rideId, driverId } = job.attrs.data;
    const ride = yield ride_model_1.Ride.findById(rideId);
    if (!ride || ride.status !== ride_interface_1.RideStatus.REQUESTED || ((_a = ride === null || ride === void 0 ? void 0 : ride.driver) === null || _a === void 0 ? void 0 : _a.toString()) !== driverId)
        return;
    console.log(`Driver ${driverId} did not respond in time for ride ${rideId}`);
    ride.rejectedDrivers.push(ride.driver);
    ride.driver = null;
    ride.vehicle = null;
    yield ride.save();
    const newDriver = yield (0, findNearestAvailableDriver_1.findNearestAvailableDriver)(rideId);
    if (newDriver) {
        ride.driver = newDriver._id;
        ride.status = ride_interface_1.RideStatus.REQUESTED;
        yield ride.save();
        // cancel old timeout job
        yield agenda_1.agenda.cancel({ name: "driverResponseTimeout", "data.rideId": ride._id.toString(), "data.driverId": driverId });
        // schedule new timeout job for new driver
        yield agenda_1.agenda.schedule("5 minutes", "driverResponseTimeout", {
            rideId: ride._id.toString(),
            driverId: newDriver._id.toString(),
        });
    }
    else {
        ride.status = ride_interface_1.RideStatus.PENDING;
        ride.driver = null;
        ride.vehicle = null;
        yield ride.save();
        try {
            yield agenda_1.agenda.every("30 seconds", "checkPendingRide", { rideId: ride._id.toString() });
        }
        catch (err) {
            console.error(`[ERROR] Failed to schedule checkPendingRide job for ride ${ride._id.toString()}:`, err);
        }
    }
}));
agenda_1.agenda.define("checkPendingRide", (job) => __awaiter(void 0, void 0, void 0, function* () {
    const { rideId } = job.attrs.data;
    console.log(rideId);
    const ride = yield ride_model_1.Ride.findById(rideId);
    if (!ride || ride.status !== ride_interface_1.RideStatus.PENDING)
        return;
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
        yield agenda_1.agenda.cancel({ name: "checkPendingRide", "data.rideId": ride._id.toString() });
        yield agenda_1.agenda.cancel({ name: "driverResponseTimeout", "data.rideId": ride._id.toString() });
        console.log(`Ride ${rideId} cancelled after 10 mins`);
        return;
    }
    // Try to assign a driver again 
    const driver = yield (0, findNearestAvailableDriver_1.findNearestAvailableDriver)(rideId.toString());
    if (driver) {
        ride.driver = driver._id;
        const activeVehicle = yield vehicle_model_1.Vehicle.findOne({ user: driver.user, isActive: true });
        ride.vehicle = activeVehicle === null || activeVehicle === void 0 ? void 0 : activeVehicle._id;
        ride.status = ride_interface_1.RideStatus.REQUESTED;
        yield ride.save();
        yield agenda_1.agenda.cancel({ name: "driverResponseTimeout", "data.rideId": ride._id.toString() });
        // Schedule new timeout job for the newly assigned driver 
        yield agenda_1.agenda.schedule("5 minutes", "driverResponseTimeout", { rideId: ride._id.toString(), driverId: driver._id.toString() });
        yield agenda_1.agenda.cancel({ name: "checkPendingRide", "data.rideId": ride._id.toString() });
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
