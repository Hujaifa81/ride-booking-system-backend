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
exports.driverEarningCalculation = exports.finalFareCalculation = exports.calculateApproxFareWithSurge = exports.PenaltyFareForExceedingTime = exports.approxFareCalculation = void 0;
const driver_interface_1 = require("../modules/driver/driver.interface");
const driver_model_1 = require("../modules/driver/driver.model");
const ride_interface_1 = require("../modules/ride/ride.interface");
const ride_model_1 = require("../modules/ride/ride.model");
const user_interface_1 = require("../modules/user/user.interface");
const kmCalculation_1 = require("./kmCalculation");
const surge_1 = require("./surge");
const approxFareCalculation = (pickupLocation, dropOffLocation) => {
    const km = (0, kmCalculation_1.kmCalculation)(pickupLocation, dropOffLocation);
    // --- Fare Calculation ---
    const baseFare = 50;
    const perKm = 25;
    const perMinute = 5;
    const timeInMinutes = (km / 40) * 60; // assuming avg 40 km/h
    const approxTotalFare = baseFare + km * perKm + timeInMinutes * perMinute;
    return Math.round(approxTotalFare);
};
exports.approxFareCalculation = approxFareCalculation;
const PenaltyFareForExceedingTime = (startTime, completedTime, pickupLocation, dropOffLocation) => {
    const durationInMinutes = (completedTime.getTime() - startTime.getTime()) / (1000 * 60);
    const km = (0, kmCalculation_1.kmCalculation)(pickupLocation, dropOffLocation);
    const expectedDuration = (km / 40) * 60; // Assuming average speed of 40 km/h
    if (durationInMinutes > expectedDuration) {
        const extraTime = durationInMinutes - expectedDuration;
        const penaltyPerMinute = 10; // Penalty rate per extra minute
        return extraTime * penaltyPerMinute;
    }
    return 0;
};
exports.PenaltyFareForExceedingTime = PenaltyFareForExceedingTime;
const calculateApproxFareWithSurge = (pickupLocation, dropOffLocation) => __awaiter(void 0, void 0, void 0, function* () {
    const drivers = yield driver_model_1.Driver.find({
        status: driver_interface_1.DriverStatus.AVAILABLE,
        approved: true,
        activeRide: null,
        isSuspended: { $ne: true }, // avoid suspended drivers
        location: {
            $near: {
                $geometry: { type: "Point", coordinates: pickupLocation.coordinates },
                $maxDistance: 5000, // 5 km radius
            },
        },
    })
        .populate({
        path: "user",
        match: { isActive: user_interface_1.IsActive.ACTIVE, isDeleted: false }, // filter inactive users
    })
        .lean();
    const filteredDrivers = drivers.filter((d) => d.user !== null);
    const totalDriversNearBy = filteredDrivers.length;
    // Active ride requests nearby
    const totalActiveRides = yield ride_model_1.Ride.countDocuments({
        status: { $in: [ride_interface_1.RideStatus.PENDING, ride_interface_1.RideStatus.REQUESTED] },
        pickupLocation: {
            $geoWithin: {
                $centerSphere: [pickupLocation.coordinates, 5000 / 6378137] // 5000 meters radius, Earth's radius in meters
            }
        },
    });
    const demandSurge = (0, surge_1.getSurgeMultiplier)(totalActiveRides, totalDriversNearBy);
    // Time-based minimum surge
    const timeSurge = (0, surge_1.getTimeBasedSurge)();
    // Apply the **higher** of the two
    const finalSurge = Math.max(demandSurge, timeSurge);
    const approxFare = (0, exports.approxFareCalculation)(pickupLocation, dropOffLocation) * finalSurge;
    return Math.round(approxFare);
});
exports.calculateApproxFareWithSurge = calculateApproxFareWithSurge;
const finalFareCalculation = (approxFare, penaltyFare) => {
    return approxFare + penaltyFare;
};
exports.finalFareCalculation = finalFareCalculation;
const driverEarningCalculation = (finalFare) => {
    const driverSharePercentage = 0.75; // Assuming driver gets 75% of the final fare
    return finalFare * driverSharePercentage;
};
exports.driverEarningCalculation = driverEarningCalculation;
