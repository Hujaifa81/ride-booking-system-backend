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
exports.cancelRide = exports.completedRide = exports.reachedDestinationRide = exports.inTransitRide = exports.driverArrived = exports.goingToPickup = void 0;
const AppError_1 = __importDefault(require("../errorHelpers/AppError"));
const driver_model_1 = require("../modules/driver/driver.model");
const ride_interface_1 = require("../modules/ride/ride.interface");
const ride_model_1 = require("../modules/ride/ride.model");
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const driver_interface_1 = require("../modules/driver/driver.interface");
const fareCalculation_1 = require("./fareCalculation");
const user_interface_1 = require("../modules/user/user.interface");
const user_model_1 = require("../modules/user/user.model");
const agenda_1 = require("../agenda/agenda");
const goingToPickup = (rideId, token) => __awaiter(void 0, void 0, void 0, function* () {
    const ride = yield ride_model_1.Ride.findById(rideId);
    if (!ride) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Ride not found");
    }
    if (!ride.driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not assigned to this ride yet");
    }
    if (token.role === user_interface_1.Role.ADMIN) {
        ride.status = ride_interface_1.RideStatus.GOING_TO_PICK_UP;
        ride.statusHistory.push({
            status: ride_interface_1.RideStatus.GOING_TO_PICK_UP,
            by: token.userId,
            timestamp: new Date()
        });
        yield ride.save();
        return ride;
    }
    if (!token.role || token.role !== 'DRIVER') {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "Drivers can pick up rides.");
    }
    const driver = yield driver_model_1.Driver.findOne({ user: token.userId });
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not found");
    }
    if (String(driver._id) !== String(ride.driver)) {
        throw new AppError_1.default(http_status_codes_1.default.FORBIDDEN, "You do not have permission to pick up this ride.");
    }
    if (ride.status !== ride_interface_1.RideStatus.ACCEPTED) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You can only pick up a ride that is in ACCEPTED status.");
    }
    ride.status = ride_interface_1.RideStatus.GOING_TO_PICK_UP;
    ride.statusHistory.push({
        status: ride_interface_1.RideStatus.GOING_TO_PICK_UP,
        by: driver._id,
        timestamp: new Date()
    });
    yield ride.save();
    return ride;
});
exports.goingToPickup = goingToPickup;
const driverArrived = (rideId, token) => __awaiter(void 0, void 0, void 0, function* () {
    const ride = yield ride_model_1.Ride.findById(rideId);
    if (!ride) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Ride not found");
    }
    if (!ride.driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not assigned to this ride yet");
    }
    if (token.role === user_interface_1.Role.ADMIN) {
        ride.status = ride_interface_1.RideStatus.DRIVER_ARRIVED;
        ride.statusHistory.push({
            status: ride_interface_1.RideStatus.DRIVER_ARRIVED,
            by: token.userId,
            timestamp: new Date()
        });
        yield ride.save();
        return ride;
    }
    if (!token.role || token.role !== 'DRIVER') {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "Drivers can mark rides as arrived.");
    }
    const driver = yield driver_model_1.Driver.findOne({ user: token.userId });
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not found");
    }
    if (String(driver._id) !== String(ride.driver)) {
        throw new AppError_1.default(http_status_codes_1.default.FORBIDDEN, "You do not have permission to mark this ride as arrived.");
    }
    if (ride.status !== ride_interface_1.RideStatus.GOING_TO_PICK_UP) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You can only mark a ride as arrived that is in GOING_TO_PICK_UP status.");
    }
    ride.status = ride_interface_1.RideStatus.DRIVER_ARRIVED;
    ride.statusHistory.push({
        status: ride_interface_1.RideStatus.DRIVER_ARRIVED,
        by: driver._id,
        timestamp: new Date()
    });
    yield ride.save();
    return ride;
});
exports.driverArrived = driverArrived;
const inTransitRide = (rideId, token) => __awaiter(void 0, void 0, void 0, function* () {
    const ride = yield ride_model_1.Ride.findById(rideId);
    if (!ride) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Ride not found");
    }
    if (!ride.driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not assigned to this ride yet");
    }
    if (token.role === user_interface_1.Role.ADMIN) {
        ride.status = ride_interface_1.RideStatus.IN_TRANSIT;
        ride.statusHistory.push({
            status: ride_interface_1.RideStatus.IN_TRANSIT,
            by: token.userId,
            timestamp: new Date()
        });
        yield ride.save();
        return ride;
    }
    if (!token.role || token.role !== 'DRIVER') {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "Drivers can mark rides as in transit.");
    }
    const driver = yield driver_model_1.Driver.findOne({ user: token.userId });
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not found");
    }
    if (!ride) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Ride not found");
    }
    if (String(driver._id) !== String(ride.driver)) {
        throw new AppError_1.default(http_status_codes_1.default.FORBIDDEN, "You do not have permission to mark this ride as in transit.");
    }
    if (ride.status !== ride_interface_1.RideStatus.DRIVER_ARRIVED) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You can only mark a ride as in transit that is in PICKED_UP status.");
    }
    ride.status = ride_interface_1.RideStatus.IN_TRANSIT;
    ride.statusHistory.push({
        status: ride_interface_1.RideStatus.IN_TRANSIT,
        by: driver._id,
        timestamp: new Date()
    });
    yield ride.save();
    return ride;
});
exports.inTransitRide = inTransitRide;
const reachedDestinationRide = (rideId, token) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const ride = yield ride_model_1.Ride.findById(rideId);
    if (!ride) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Ride not found");
    }
    if (!ride.driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not assigned to this ride yet");
    }
    if (token.role === user_interface_1.Role.ADMIN) {
        ride.status = ride_interface_1.RideStatus.REACHED_DESTINATION;
        ride.statusHistory.push({
            status: ride_interface_1.RideStatus.REACHED_DESTINATION,
            by: token.userId,
            timestamp: new Date()
        });
        yield ride.save();
        return ride;
    }
    if (!token.role || token.role !== 'DRIVER') {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "Only drivers can mark rides as reached destination.");
    }
    const driver = yield driver_model_1.Driver.findOne({ user: token.userId });
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not found");
    }
    if (!ride) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Ride not found");
    }
    if (String(driver._id) !== String(ride.driver)) {
        throw new AppError_1.default(http_status_codes_1.default.FORBIDDEN, "You do not have permission to mark this ride as reached destination.");
    }
    if (ride.status !== ride_interface_1.RideStatus.IN_TRANSIT) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You can only mark a ride as reached destination that is in IN_TRANSIT status.");
    }
    ride.status = ride_interface_1.RideStatus.REACHED_DESTINATION;
    ride.statusHistory.push({
        status: ride_interface_1.RideStatus.REACHED_DESTINATION,
        by: driver._id,
        timestamp: new Date()
    });
    yield ride.save();
    const startTime = (_a = ride.statusHistory.find(log => log.status === ride_interface_1.RideStatus.IN_TRANSIT)) === null || _a === void 0 ? void 0 : _a.timestamp;
    const completedTime = (_b = ride.statusHistory.find(log => log.status === ride_interface_1.RideStatus.REACHED_DESTINATION)) === null || _b === void 0 ? void 0 : _b.timestamp;
    const penaltyFare = (0, fareCalculation_1.PenaltyFareForExceedingTime)(startTime, completedTime, ride.pickupLocation, ride.dropOffLocation);
    const finalFare = (0, fareCalculation_1.finalFareCalculation)(ride.approxFare, penaltyFare);
    ride.finalFare = finalFare;
    yield ride.save();
    return ride;
});
exports.reachedDestinationRide = reachedDestinationRide;
const completedRide = (rideId, token) => __awaiter(void 0, void 0, void 0, function* () {
    const ride = yield ride_model_1.Ride.findById(rideId);
    if (!ride) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Ride not found");
    }
    if (!ride.driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not assigned to this ride yet");
    }
    if (token.role === user_interface_1.Role.ADMIN) {
        const driver = yield driver_model_1.Driver.findOne({ user: ride.driver });
        if (driver) {
            if (driver.activeRide && String(driver.activeRide) === String(ride._id)) {
                driver.activeRide = null;
                if (driver.status === driver_interface_1.DriverStatus.ON_TRIP) {
                    driver.status = driver_interface_1.DriverStatus.AVAILABLE;
                }
            }
            const driverEarning = (0, fareCalculation_1.driverEarningCalculation)(ride.finalFare);
            driver.earnings = Number(driver.earnings) + driverEarning;
            yield driver.save();
        }
        ride.status = ride_interface_1.RideStatus.COMPLETED;
        ride.statusHistory.push({
            status: ride_interface_1.RideStatus.COMPLETED,
            by: token.userId,
            timestamp: new Date()
        });
        yield ride.save();
        return ride;
    }
    if (!token.role || token.role !== 'DRIVER') {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "Only drivers can mark rides as completed.");
    }
    const driver = yield driver_model_1.Driver.findOne({ user: token.userId });
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not found");
    }
    if (!ride) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Ride not found");
    }
    if (String(driver._id) !== String(ride.driver)) {
        throw new AppError_1.default(http_status_codes_1.default.FORBIDDEN, "You do not have permission to mark this ride as completed.");
    }
    if (ride.status !== ride_interface_1.RideStatus.REACHED_DESTINATION) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You can only mark a ride as completed that is in REACHED_DESTINATION status.");
    }
    ride.status = ride_interface_1.RideStatus.COMPLETED;
    ride.statusHistory.push({
        status: ride_interface_1.RideStatus.COMPLETED,
        by: driver._id,
        timestamp: new Date()
    });
    yield ride.save();
    driver.activeRide = null;
    driver.status = driver_interface_1.DriverStatus.AVAILABLE;
    const driverEarning = (0, fareCalculation_1.driverEarningCalculation)(ride.finalFare);
    driver.earnings = Number(driver.earnings) + driverEarning;
    // driver.location = ride.dropOffLocation;
    yield driver.save();
    return ride;
});
exports.completedRide = completedRide;
const cancelRide = (rideId, canceledReason, token) => __awaiter(void 0, void 0, void 0, function* () {
    const ride = yield ride_model_1.Ride.findById(rideId);
    if (!ride) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Ride not found");
    }
    if (token.role === user_interface_1.Role.ADMIN) {
        if (ride.status === ride_interface_1.RideStatus.CANCELLED_BY_DRIVER || ride.status === ride_interface_1.RideStatus.CANCELLED_BY_RIDER || ride.status === ride_interface_1.RideStatus.CANCELLED_BY_ADMIN || ride.status === ride_interface_1.RideStatus.CANCELLED_FOR_PENDING_TIME_OVER) {
            throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "This ride has already been canceled.");
        }
        if (ride.status === ride_interface_1.RideStatus.COMPLETED) {
            throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You cannot cancel a completed ride.");
        }
        ride.status = ride_interface_1.RideStatus.CANCELLED_BY_ADMIN;
        ride.canceledReason = canceledReason;
        ride.statusHistory.push({
            status: ride_interface_1.RideStatus.CANCELLED_BY_ADMIN,
            by: token.userId,
            timestamp: new Date()
        });
        yield ride.save();
        const driver = yield driver_model_1.Driver.findOne({ user: ride.driver });
        if (ride.driver && driver && driver.activeRide && String(driver.activeRide) === String(ride._id)) {
            if (driver.activeRide && String(driver.activeRide) === String(ride._id)) {
                driver.activeRide = null;
                if (driver.status === driver_interface_1.DriverStatus.ON_TRIP) {
                    driver.status = driver_interface_1.DriverStatus.AVAILABLE;
                }
                yield driver.save();
            }
        }
        return ride;
    }
    if (token.role === user_interface_1.Role.DRIVER) {
        const driver = yield driver_model_1.Driver.findOne({ user: token.userId });
        if (!driver) {
            throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not found");
        }
        if (String(driver._id) !== String(ride.driver)) {
            throw new AppError_1.default(http_status_codes_1.default.FORBIDDEN, "You do not have permission to cancel this ride.");
        }
        if (ride.status === ride_interface_1.RideStatus.CANCELLED_BY_DRIVER || ride.status === ride_interface_1.RideStatus.CANCELLED_BY_RIDER || ride.status === ride_interface_1.RideStatus.CANCELLED_BY_ADMIN || ride.status === ride_interface_1.RideStatus.CANCELLED_FOR_PENDING_TIME_OVER) {
            throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "This ride has already been canceled.");
        }
        if (ride.status === ride_interface_1.RideStatus.REQUESTED) {
            throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You cannot cancel a ride that is in REQUESTED status.First accept the ride.");
        }
        if (ride.status === ride_interface_1.RideStatus.COMPLETED) {
            throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You cannot cancel a completed ride.");
        }
        if (ride.status === ride_interface_1.RideStatus.REACHED_DESTINATION) {
            throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You cannot cancel a ride that has reached the destination.");
        }
        if (ride.status === ride_interface_1.RideStatus.IN_TRANSIT) {
            throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You cannot cancel a ride that is in transit.");
        }
        ride.status = ride_interface_1.RideStatus.CANCELLED_BY_DRIVER;
        ride.canceledReason = canceledReason || "UNKNOWN";
        ride.statusHistory.push({
            status: ride_interface_1.RideStatus.CANCELLED_BY_DRIVER,
            by: driver._id,
            timestamp: new Date()
        });
        yield ride.save();
        //if a driver total cancelled rides exceed 3 then block the driver
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
        const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
        const totalCancelledRidesToday = yield ride_model_1.Ride.countDocuments({
            driver: driver._id,
            statusHistory: {
                $elemMatch: {
                    status: ride_interface_1.RideStatus.CANCELLED_BY_DRIVER,
                    timestamp: { $gte: todayStart, $lt: todayEnd }
                }
            }
        });
        if (totalCancelledRidesToday >= 3) {
            //block the rider
            yield user_model_1.User.findByIdAndUpdate(token.userId, { isActive: user_interface_1.IsActive.BLOCKED }, { new: true, runValidators: true });
            //schedule a job to unblock the rider after 24 hours
            yield agenda_1.agenda.schedule("24 hours", "unblockUserAfter24Hours", { userId: token.userId.toString() });
        }
        if (driver.activeRide && String(driver.activeRide) === String(ride._id)) {
            driver.activeRide = null;
            if (totalCancelledRidesToday < 3) {
                driver.status = driver_interface_1.DriverStatus.AVAILABLE;
            }
            else {
                driver.status = driver_interface_1.DriverStatus.OFFLINE;
            }
            yield driver.save();
        }
        return ride;
    }
    if (token.role === user_interface_1.Role.RIDER) {
        if (String(ride.user) !== token.userId) {
            throw new AppError_1.default(http_status_codes_1.default.FORBIDDEN, "You do not have permission to cancel this ride.");
        }
        if (ride.status === ride_interface_1.RideStatus.CANCELLED_BY_DRIVER || ride.status === ride_interface_1.RideStatus.CANCELLED_BY_RIDER || ride.status === ride_interface_1.RideStatus.CANCELLED_BY_ADMIN || ride.status === ride_interface_1.RideStatus.CANCELLED_FOR_PENDING_TIME_OVER) {
            throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "This ride has already been canceled.");
        }
        if (ride.status === ride_interface_1.RideStatus.COMPLETED) {
            throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You cannot cancel a completed ride.");
        }
        if (ride.status === ride_interface_1.RideStatus.ACCEPTED) {
            throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You cannot cancel a ride that has been accepted by a driver. Please contact support if you wish to cancel this ride.");
        }
        if (ride.status === ride_interface_1.RideStatus.REACHED_DESTINATION) {
            throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You cannot cancel a ride that has reached the destination.");
        }
        if (ride.status === ride_interface_1.RideStatus.IN_TRANSIT) {
            throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You cannot cancel a ride that is in transit.");
        }
        ride.status = ride_interface_1.RideStatus.CANCELLED_BY_RIDER;
        ride.canceledReason = canceledReason || "UNKNOWN";
        ride.statusHistory.push({
            status: ride_interface_1.RideStatus.CANCELLED_BY_RIDER,
            by: ride.user,
            timestamp: new Date()
        });
        yield ride.save();
        //if a rider total cancelled rides exceed 3 then block the rider
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
        const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
        const totalCancelledRidesToday = yield ride_model_1.Ride.countDocuments({
            user: token.userId,
            statusHistory: {
                $elemMatch: {
                    status: ride_interface_1.RideStatus.CANCELLED_BY_RIDER,
                    timestamp: { $gte: todayStart, $lt: todayEnd }
                }
            }
        });
        if (totalCancelledRidesToday >= 3) {
            //block the rider
            yield user_model_1.User.findByIdAndUpdate(token.userId, { isActive: user_interface_1.IsActive.BLOCKED }, { new: true, runValidators: true });
            //schedule a job to unblock the rider after 24 hours
            yield agenda_1.agenda.schedule("24 hours", "unblockUserAfter24Hours", { userId: token.userId.toString() });
        }
        if (ride.driver) {
            const driver = yield driver_model_1.Driver.findOne({ _id: ride.driver });
            if (driver && driver.activeRide && String(driver.activeRide) === String(ride._id)) {
                driver.activeRide = null;
                if (driver.status === driver_interface_1.DriverStatus.ON_TRIP) {
                    driver.status = driver_interface_1.DriverStatus.AVAILABLE;
                }
                yield driver.save();
            }
        }
        const rideAllDetails = yield ride_model_1.Ride.findById(rideId).populate('driver').populate('user');
        return rideAllDetails;
    }
});
exports.cancelRide = cancelRide;
