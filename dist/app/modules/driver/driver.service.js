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
exports.DriverService = void 0;
const AppError_1 = __importDefault(require("../../errorHelpers/AppError"));
const driver_interface_1 = require("./driver.interface");
const driver_model_1 = require("./driver.model");
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const vehicle_model_1 = require("../vehicle/vehicle.model");
const user_model_1 = require("../user/user.model");
const user_interface_1 = require("../user/user.interface");
const ride_model_1 = require("../ride/ride.model");
const fareCalculation_1 = require("../../utils/fareCalculation");
const ride_interface_1 = require("../ride/ride.interface");
const queryBuilder_1 = require("../../utils/queryBuilder");
const driver_constant_1 = require("./driver.constant");
const createDriver = (payload, token) => __awaiter(void 0, void 0, void 0, function* () {
    const isDriverExist = yield driver_model_1.Driver.findOne({ user: token.userId });
    if (isDriverExist) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "Driver already exists with this user");
    }
    const user = yield user_model_1.User.findById(token.userId);
    if (!(user === null || user === void 0 ? void 0 : user.phone)) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "Please add phone number to your profile first.");
    }
    if (!user || !user.isVerified) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You are not verified yet. Please verify your account first.");
    }
    const isAnyVehicleExist = yield vehicle_model_1.Vehicle.findOne({ user: token.userId });
    if (!isAnyVehicleExist) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "User does not have any vehicle. Please add a vehicle first.");
    }
    const driver = yield driver_model_1.Driver.create(Object.assign(Object.assign({}, payload), { user: token.userId }));
    return driver;
});
const getAllDrivers = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const queryBuilder = new queryBuilder_1.QueryBuilder(driver_model_1.Driver.find(), query);
    const drivers = yield queryBuilder
        .geoLocationSearch()
        .search(driver_constant_1.driverSearchableFields)
        .filter()
        .sort()
        .fields()
        .paginate();
    const [data, meta] = yield Promise.all([
        drivers.build(),
        queryBuilder.getMeta()
    ]);
    const driversWithCars = yield Promise.all(data.map((driver) => __awaiter(void 0, void 0, void 0, function* () {
        const vehicles = yield vehicle_model_1.Vehicle.find({ user: driver.user });
        return Object.assign(Object.assign({}, driver.toObject()), { vehicles });
    })));
    return { meta, data: driversWithCars };
});
const driverApprovedStatusChange = (driverId) => __awaiter(void 0, void 0, void 0, function* () {
    const driver = yield driver_model_1.Driver.findById(driverId);
    const user = yield user_model_1.User.findById(driver === null || driver === void 0 ? void 0 : driver.user);
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not found");
    }
    driver.approved = !driver.approved;
    yield driver.save();
    if (user) {
        user.role = driver.approved ? user_interface_1.Role.DRIVER : user_interface_1.Role.RIDER;
        yield user.save();
    }
    return { driver, user };
});
const driverStatusChange = (updateStatus, token) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const driver = yield driver_model_1.Driver.findOne({ user: token.userId });
    const vehicles = yield vehicle_model_1.Vehicle.find({ user: token.userId });
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not found");
    }
    if (((_a = driver === null || driver === void 0 ? void 0 : driver.user) === null || _a === void 0 ? void 0 : _a.toString()) !== token.userId) {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "You do not have permission to change this driver's status");
    }
    if (driver.isSuspended) {
        throw new AppError_1.default(http_status_codes_1.default.FORBIDDEN, "You are suspended by admin. You cannot change your status.");
    }
    if (!driver.approved) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "User is not approved as a driver yet.");
    }
    if (driver.status === driver_interface_1.DriverStatus.ON_TRIP) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You cannot change status while on trip");
    }
    if (updateStatus === driver_interface_1.DriverStatus.AVAILABLE) {
        const activeVehicle = vehicles.some(vehicle => vehicle.isActive === true);
        if (!activeVehicle) {
            throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "Do not have any active vehicle. Please activate a vehicle first.");
        }
        if (!driver.location) {
            throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "Update location first to go available.");
        }
    }
    if (updateStatus === driver_interface_1.DriverStatus.ON_TRIP) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You cannot change status to ON_TRIP. This is done by the system when a ride is accepted.");
    }
    if ((updateStatus !== driver_interface_1.DriverStatus.AVAILABLE) && (updateStatus !== driver_interface_1.DriverStatus.OFFLINE)) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "Invalid status change request");
    }
    driver.status = updateStatus;
    yield driver.save();
    if (driver.status === driver_interface_1.DriverStatus.OFFLINE) {
        driver.location = null;
        yield driver.save();
    }
    return driver;
});
const driverLocationUpdate = (location, token) => __awaiter(void 0, void 0, void 0, function* () {
    const driver = yield driver_model_1.Driver.findOne({ user: token.userId });
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not found");
    }
    if (driver.user.toString() !== token.userId) {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "You do not have permission to update this driver's location");
    }
    if (driver.status === driver_interface_1.DriverStatus.ON_TRIP) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You cannot change location while on trip");
    }
    driver.location = location;
    yield driver.save();
    return driver;
});
const getDriverEarningsHistory = (driverId, token) => __awaiter(void 0, void 0, void 0, function* () {
    const driver = yield driver_model_1.Driver.findById(driverId);
    const rides = yield ride_model_1.Ride.find({ driver: driverId, status: ride_interface_1.RideStatus.COMPLETED });
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not found");
    }
    if (driver.user.toString() !== token.userId && token.role !== user_interface_1.Role.ADMIN) {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "You are not authorized to view this earnings history");
    }
    const earningsHistoryFromRides = rides.map(ride => {
        const earningCalculation = (0, fareCalculation_1.driverEarningCalculation)(Number(ride === null || ride === void 0 ? void 0 : ride.finalFare));
        return {
            rideId: ride._id,
            fare: ride.finalFare,
            earningFromThisRide: earningCalculation,
            pickupLocation: ride.pickupLocation,
            dropOffLocation: ride.dropOffLocation,
        };
    });
    return earningsHistoryFromRides;
});
const driverSuspendedStatusChange = (driverId, isSuspended) => __awaiter(void 0, void 0, void 0, function* () {
    const driver = yield driver_model_1.Driver.findById(driverId);
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not found");
    }
    if (driver.isSuspended === isSuspended) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, `Driver is already ${isSuspended ? 'suspended' : 'active'}`);
    }
    driver.isSuspended = isSuspended;
    yield driver.save();
    return driver;
});
const updateDriverRating = (driverId, rating, rideId, token) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const driver = yield driver_model_1.Driver.findById(driverId);
    const ride = yield ride_model_1.Ride.findById(rideId);
    const totalRidesWithRating = yield ride_model_1.Ride.find({ driver: driverId, status: ride_interface_1.RideStatus.COMPLETED, rating: { $ne: null } });
    if (token.role !== user_interface_1.Role.RIDER) {
        throw new AppError_1.default(http_status_codes_1.default.FORBIDDEN, "Only riders can rate drivers");
    }
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not found");
    }
    if (!ride) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Ride not found");
    }
    if (ride.user.toString() !== token.userId) {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "You are not authorized to rate this driver for this ride");
    }
    if (((_a = ride.driver) === null || _a === void 0 ? void 0 : _a.toString()) !== driverId) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "This driver was not assigned to this ride");
    }
    if (ride.status !== ride_interface_1.RideStatus.COMPLETED) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You can rate the driver only after the ride is completed");
    }
    if (ride.rating) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You have already rated this driver for this ride");
    }
    const totalRating = totalRidesWithRating.length ? totalRidesWithRating.reduce((acc, curr) => acc + (curr.rating || 0), 0) : 0;
    const newAverageRating = (totalRating + rating) / (totalRidesWithRating.length + 1);
    driver.rating = newAverageRating;
    yield driver.save();
    ride.rating = rating;
    yield ride.save();
    return { driver, ride };
});
exports.DriverService = {
    createDriver,
    getAllDrivers,
    driverApprovedStatusChange,
    driverStatusChange,
    driverLocationUpdate,
    getDriverEarningsHistory,
    driverSuspendedStatusChange,
    updateDriverRating
};
