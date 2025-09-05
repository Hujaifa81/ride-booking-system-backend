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
exports.findNearestAvailableDriver = void 0;
const driver_interface_1 = require("../modules/driver/driver.interface");
const driver_model_1 = require("../modules/driver/driver.model");
const ride_model_1 = require("../modules/ride/ride.model");
const user_interface_1 = require("../modules/user/user.interface");
const findNearestAvailableDriver = (rideId) => __awaiter(void 0, void 0, void 0, function* () {
    const ride = yield ride_model_1.Ride.findById(rideId);
    if (!ride)
        throw new Error("Ride not found");
    // Find all candidate drivers within 5km
    const drivers = yield driver_model_1.Driver.find({
        status: driver_interface_1.DriverStatus.AVAILABLE,
        approved: true,
        activeRide: null,
        isSuspended: { $ne: true },
        _id: { $nin: ride.rejectedDrivers || [] },
        location: {
            $near: {
                $geometry: { type: "Point", coordinates: ride.pickupLocation.coordinates },
                $maxDistance: 5000, // 5 km radius
            },
        },
    })
        .populate({
        path: "user",
        match: { isActive: user_interface_1.IsActive.ACTIVE, isDeleted: false }, // only active users
    })
        .lean();
    // Filter out drivers where user didn’t match
    const validDrivers = drivers.filter((d) => d.user !== null);
    console.log(validDrivers);
    // Return nearest valid driver (first one, since $near already sorts by distance)
    return validDrivers.length > 0 ? validDrivers[0] : null;
});
exports.findNearestAvailableDriver = findNearestAvailableDriver;
