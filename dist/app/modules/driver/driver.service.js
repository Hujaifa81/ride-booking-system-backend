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
const getMyDriverProfile = (token) => __awaiter(void 0, void 0, void 0, function* () {
    const driver = yield driver_model_1.Driver.findOne({ user: token.userId });
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver profile not found");
    }
    const vehicle = yield vehicle_model_1.Vehicle.find({ user: token.userId });
    const profile = Object.assign(Object.assign({}, driver.toObject()), { vehicles: vehicle });
    return profile;
});
const getDriverDashboardMetrics = (token) => __awaiter(void 0, void 0, void 0, function* () {
    const driver = yield driver_model_1.Driver.findOne({ user: token.userId });
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver profile not found");
    }
    const tripsToday = yield ride_model_1.Ride.countDocuments({
        driver: driver._id,
        statusHistory: {
            $elemMatch: {
                status: ride_interface_1.RideStatus.COMPLETED,
                timestamp: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date().setHours(23, 59, 59, 999)),
                },
            },
        },
    });
    const earningsToday = yield ride_model_1.Ride.aggregate([
        {
            $match: {
                driver: driver._id,
                statusHistory: {
                    $elemMatch: {
                        status: ride_interface_1.RideStatus.COMPLETED,
                        timestamp: {
                            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                            $lte: new Date(new Date().setHours(23, 59, 59, 999)),
                        },
                    },
                },
            },
        },
        // driver earnings as 75% of finalFare
        {
            $project: {
                driverEarning: { $multiply: ["$finalFare", 0.75] }
            }
        },
        {
            $group: {
                _id: null,
                totalEarnings: { $sum: "$driverEarning" }
            }
        }
    ]);
    const totalEarningsToday = earningsToday.length > 0 ? earningsToday[0].totalEarnings : 0;
    const rating = driver.rating || 0;
    const cancelledToday = yield ride_model_1.Ride.countDocuments({
        driver: driver._id,
        statusHistory: {
            $elemMatch: {
                status: ride_interface_1.RideStatus.CANCELLED_BY_DRIVER,
                timestamp: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date().setHours(23, 59, 59, 999)),
                },
            },
        },
    });
    return {
        tripsToday,
        totalEarningsToday,
        rating,
        cancelledToday
    };
});
const getDriverEarningsAnalytics = (token, filter) => __awaiter(void 0, void 0, void 0, function* () {
    const validFilters = ['daily', 'weekly', 'monthly', 'yearly'];
    const driver = yield driver_model_1.Driver.findOne({ user: token.userId });
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver profile not found");
    }
    if (!validFilters.includes(filter)) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "Invalid filter. Valid options are 'daily', 'weekly', 'monthly', 'yearly'");
    }
    const now = new Date();
    let currentPeriodStart;
    let currentPeriodEnd;
    let previousPeriodStart;
    let previousPeriodEnd;
    let periodLabel = "";
    if (filter === 'daily') {
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentPeriodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousPeriodStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
        previousPeriodEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), Math.min(now.getDate(), new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate()), 23, 59, 59, 999);
        periodLabel = `Day ${now.getDate()} of ${now.toLocaleString('default', { month: 'long' })}`;
        const currentData = yield ride_model_1.Ride.aggregate([
            {
                $match: {
                    driver: driver._id,
                    status: ride_interface_1.RideStatus.COMPLETED,
                    "statusHistory.timestamp": { $gte: currentPeriodStart, $lte: currentPeriodEnd }
                }
            },
            { $unwind: "$statusHistory" },
            { $match: { "statusHistory.status": ride_interface_1.RideStatus.COMPLETED } },
            {
                $group: {
                    _id: {
                        year: { $year: "$statusHistory.timestamp" },
                        month: { $month: "$statusHistory.timestamp" },
                        day: { $dayOfMonth: "$statusHistory.timestamp" }
                    },
                    totalEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } },
                    rideCount: { $sum: 1 }
                }
            },
            { $sort: { "_id.day": 1 } }
        ]);
        const previousData = yield ride_model_1.Ride.aggregate([
            {
                $match: {
                    driver: driver._id,
                    status: ride_interface_1.RideStatus.COMPLETED,
                    "statusHistory.timestamp": { $gte: previousPeriodStart, $lte: previousPeriodEnd }
                }
            },
            { $unwind: "$statusHistory" },
            { $match: { "statusHistory.status": ride_interface_1.RideStatus.COMPLETED } },
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } },
                    rideCount: { $sum: 1 }
                }
            }
        ]);
        const currentTotalEarnings = currentData.reduce((sum, d) => sum + d.totalEarnings, 0);
        const currentTotalRides = currentData.reduce((sum, d) => sum + d.rideCount, 0);
        const previousTotalEarnings = previousData.length > 0 ? previousData[0].totalEarnings : 0;
        const previousTotalRides = previousData.length > 0 ? previousData[0].rideCount : 0;
        const earningsChange = previousTotalEarnings === 0
            ? (currentTotalEarnings > 0 ? 100 : 0)
            : ((currentTotalEarnings - previousTotalEarnings) / previousTotalEarnings) * 100;
        const ridesChange = previousTotalRides === 0
            ? (currentTotalRides > 0 ? 100 : 0)
            : ((currentTotalRides - previousTotalRides) / previousTotalRides) * 100;
        // Additional metrics
        const highestDayEarning = currentData.length > 0 ? Math.max(...currentData.map(d => d.totalEarnings)) : 0;
        const lowestDayEarning = currentData.length > 0 ? Math.min(...currentData.map(d => d.totalEarnings)) : 0;
        const daysWithRides = currentData.length;
        const averagePerDay = daysWithRides > 0 ? currentTotalEarnings / daysWithRides : 0;
        const averagePerTrip = currentTotalRides > 0 ? currentTotalEarnings / currentTotalRides : 0;
        const details = currentData.map(d => ({
            period: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
            totalEarnings: Math.round(d.totalEarnings * 100) / 100,
            rideCount: d.rideCount
        }));
        return {
            periodLabel,
            summary: {
                currentEarnings: Math.round(currentTotalEarnings * 100) / 100,
                previousEarnings: Math.round(previousTotalEarnings * 100) / 100,
                earningsChange: Math.round(earningsChange * 100) / 100,
                earningsTrend: currentTotalEarnings >= previousTotalEarnings ? "up" : "down",
                currentRides: currentTotalRides,
                previousRides: previousTotalRides,
                ridesChange: Math.round(ridesChange * 100) / 100,
                ridesTrend: currentTotalRides >= previousTotalRides ? "up" : "down",
                averagePerDay: Math.round(averagePerDay * 100) / 100,
                averagePerTrip: Math.round(averagePerTrip * 100) / 100,
                highestDayEarning: Math.round(highestDayEarning * 100) / 100,
                lowestDayEarning: Math.round(lowestDayEarning * 100) / 100,
                totalTrips: currentTotalRides
            },
            details
        };
    }
    else if (filter === 'weekly') {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), diff);
        currentPeriodStart.setHours(0, 0, 0, 0);
        currentPeriodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const prevWeekStart = new Date(currentPeriodStart);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        previousPeriodStart = new Date(prevWeekStart);
        previousPeriodEnd = new Date(prevWeekStart);
        previousPeriodEnd.setDate(previousPeriodEnd.getDate() + 6);
        previousPeriodEnd.setHours(23, 59, 59, 999);
        // Calculate current week number using ISO week date system
        const getISOWeek = (date) => {
            const target = new Date(date.valueOf());
            const dayNumber = (date.getDay() + 6) % 7;
            target.setDate(target.getDate() - dayNumber + 3);
            const firstThursday = target.valueOf();
            target.setMonth(0, 1);
            if (target.getDay() !== 4) {
                target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
            }
            return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
        };
        const currentWeekOfYear = getISOWeek(now);
        periodLabel = `Week ${currentWeekOfYear} of ${now.getFullYear()}`;
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const currentData = yield ride_model_1.Ride.aggregate([
            {
                $match: {
                    driver: driver._id,
                    status: ride_interface_1.RideStatus.COMPLETED,
                    "statusHistory.timestamp": {
                        $gte: yearStart,
                        $lte: now
                    }
                }
            },
            { $unwind: "$statusHistory" },
            { $match: { "statusHistory.status": ride_interface_1.RideStatus.COMPLETED } },
            {
                $group: {
                    _id: {
                        year: { $year: "$statusHistory.timestamp" },
                        week: { $isoWeek: "$statusHistory.timestamp" } // Use $isoWeek instead of $week
                    },
                    totalEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } },
                    rideCount: { $sum: 1 }
                }
            },
            { $sort: { "_id.week": 1 } }
        ]);
        const previousData = yield ride_model_1.Ride.aggregate([
            {
                $match: {
                    driver: driver._id,
                    status: ride_interface_1.RideStatus.COMPLETED,
                    "statusHistory.timestamp": { $gte: previousPeriodStart, $lte: previousPeriodEnd }
                }
            },
            { $unwind: "$statusHistory" },
            { $match: { "statusHistory.status": ride_interface_1.RideStatus.COMPLETED } },
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } },
                    rideCount: { $sum: 1 }
                }
            }
        ]);
        // Get current week's data only
        const currentWeekData = currentData.find(d => d._id.week === currentWeekOfYear) || { totalEarnings: 0, rideCount: 0 };
        const currentTotalEarnings = currentWeekData.totalEarnings;
        const currentTotalRides = currentWeekData.rideCount;
        const previousTotalEarnings = previousData.length > 0 ? previousData[0].totalEarnings : 0;
        const previousTotalRides = previousData.length > 0 ? previousData[0].rideCount : 0;
        const earningsChange = previousTotalEarnings === 0
            ? (currentTotalEarnings > 0 ? 100 : 0)
            : ((currentTotalEarnings - previousTotalEarnings) / previousTotalEarnings) * 100;
        const ridesChange = previousTotalRides === 0
            ? (currentTotalRides > 0 ? 100 : 0)
            : ((currentTotalRides - previousTotalRides) / previousTotalRides) * 100;
        // Calculate totals for all weeks
        const totalEarningsAllWeeks = currentData.reduce((sum, d) => sum + d.totalEarnings, 0);
        const totalRidesAllWeeks = currentData.reduce((sum, d) => sum + d.rideCount, 0);
        // Additional metrics (for all weeks in the year)
        const highestWeekEarning = currentData.length > 0 ? Math.max(...currentData.map(d => d.totalEarnings)) : 0;
        const lowestWeekEarning = currentData.length > 0 ? Math.min(...currentData.map(d => d.totalEarnings)) : 0;
        const weeksWithRides = currentData.length;
        const averagePerWeek = weeksWithRides > 0 ? totalEarningsAllWeeks / weeksWithRides : 0;
        const averagePerTrip = totalRidesAllWeeks > 0 ? totalEarningsAllWeeks / totalRidesAllWeeks : 0;
        // Generate details for all weeks from 1 to current week
        const details = [];
        // Helper function to get week date range using ISO week
        const getWeekDateRange = (year, weekNum) => {
            // Get first Thursday of the year (defines week 1)
            const jan4 = new Date(year, 0, 4);
            const jan4Day = (jan4.getDay() + 6) % 7; // Convert to Monday = 0
            const weekOneStart = new Date(jan4);
            weekOneStart.setDate(jan4.getDate() - jan4Day);
            // Calculate the start of the target week
            const weekStart = new Date(weekOneStart);
            weekStart.setDate(weekOneStart.getDate() + (weekNum - 1) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            // Format dates
            const formatDate = (date) => {
                const month = date.toLocaleString('default', { month: 'short' });
                const day = date.getDate();
                return `${month} ${day}`;
            };
            return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
        };
        for (let w = 1; w <= currentWeekOfYear; w++) {
            const weekData = currentData.find(d => d._id.week === w);
            const dateRange = getWeekDateRange(now.getFullYear(), w);
            details.push({
                period: `Week ${w}`,
                dateRange: dateRange,
                weekNumber: w,
                totalEarnings: weekData ? Math.round(weekData.totalEarnings * 100) / 100 : 0,
                rideCount: weekData ? weekData.rideCount : 0
            });
        }
        return {
            periodLabel,
            summary: {
                currentEarnings: Math.round(currentTotalEarnings * 100) / 100,
                previousEarnings: Math.round(previousTotalEarnings * 100) / 100,
                earningsChange: Math.round(earningsChange * 100) / 100,
                earningsTrend: currentTotalEarnings >= previousTotalEarnings ? "up" : "down",
                currentRides: currentTotalRides,
                previousRides: previousTotalRides,
                ridesChange: Math.round(ridesChange * 100) / 100,
                ridesTrend: currentTotalRides >= previousTotalRides ? "up" : "down",
                averagePerWeek: Math.round(averagePerWeek * 100) / 100,
                averagePerTrip: Math.round(averagePerTrip * 100) / 100,
                highestWeekEarning: Math.round(highestWeekEarning * 100) / 100,
                lowestWeekEarning: Math.round(lowestWeekEarning * 100) / 100,
                totalTrips: totalRidesAllWeeks,
                currentWeekOfYear: currentWeekOfYear,
                totalWeeksInYear: 52
            },
            details
        };
    }
    else if (filter === 'monthly') {
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentPeriodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        periodLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        const currentData = yield ride_model_1.Ride.aggregate([
            {
                $match: {
                    driver: driver._id,
                    status: ride_interface_1.RideStatus.COMPLETED,
                    "statusHistory.timestamp": {
                        $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1),
                        $lte: now
                    }
                }
            },
            { $unwind: "$statusHistory" },
            { $match: { "statusHistory.status": ride_interface_1.RideStatus.COMPLETED } },
            {
                $group: {
                    _id: {
                        year: { $year: "$statusHistory.timestamp" },
                        month: { $month: "$statusHistory.timestamp" }
                    },
                    totalEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } },
                    rideCount: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);
        const previousData = yield ride_model_1.Ride.aggregate([
            {
                $match: {
                    driver: driver._id,
                    status: ride_interface_1.RideStatus.COMPLETED,
                    "statusHistory.timestamp": { $gte: previousPeriodStart, $lte: previousPeriodEnd }
                }
            },
            { $unwind: "$statusHistory" },
            { $match: { "statusHistory.status": ride_interface_1.RideStatus.COMPLETED } },
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } },
                    rideCount: { $sum: 1 }
                }
            }
        ]);
        const currentMonthData = currentData.filter(d => d._id.year === now.getFullYear() && d._id.month === now.getMonth() + 1);
        const currentTotalEarnings = currentMonthData.length > 0 ? currentMonthData[0].totalEarnings : 0;
        const currentTotalRides = currentMonthData.length > 0 ? currentMonthData[0].rideCount : 0;
        const previousTotalEarnings = previousData.length > 0 ? previousData[0].totalEarnings : 0;
        const previousTotalRides = previousData.length > 0 ? previousData[0].rideCount : 0;
        const earningsChange = previousTotalEarnings === 0
            ? (currentTotalEarnings > 0 ? 100 : 0)
            : ((currentTotalEarnings - previousTotalEarnings) / previousTotalEarnings) * 100;
        const ridesChange = previousTotalRides === 0
            ? (currentTotalRides > 0 ? 100 : 0)
            : ((currentTotalRides - previousTotalRides) / previousTotalRides) * 100;
        // Additional metrics (for all months)
        const highestMonthEarning = currentData.length > 0 ? Math.max(...currentData.map(d => d.totalEarnings)) : 0;
        const lowestMonthEarning = currentData.length > 0 ? Math.min(...currentData.map(d => d.totalEarnings)) : 0;
        const monthsWithRides = currentData.length;
        const totalEarningsAllMonths = currentData.reduce((sum, d) => sum + d.totalEarnings, 0);
        const totalRidesAllMonths = currentData.reduce((sum, d) => sum + d.rideCount, 0);
        const averagePerMonth = monthsWithRides > 0 ? totalEarningsAllMonths / monthsWithRides : 0;
        const averagePerTrip = currentTotalRides > 0 ? currentTotalEarnings / currentTotalRides : 0;
        const details = currentData.map(d => ({
            period: `${d._id.year}-${String(d._id.month).padStart(2, '0')}`,
            totalEarnings: Math.round(d.totalEarnings * 100) / 100,
            rideCount: d.rideCount
        }));
        return {
            periodLabel,
            summary: {
                currentEarnings: Math.round(currentTotalEarnings * 100) / 100,
                previousEarnings: Math.round(previousTotalEarnings * 100) / 100,
                earningsChange: Math.round(earningsChange * 100) / 100,
                earningsTrend: currentTotalEarnings >= previousTotalEarnings ? "up" : "down",
                currentRides: currentTotalRides,
                previousRides: previousTotalRides,
                ridesChange: Math.round(ridesChange * 100) / 100,
                ridesTrend: currentTotalRides >= previousTotalRides ? "up" : "down",
                averagePerMonth: Math.round(averagePerMonth * 100) / 100,
                averagePerTrip: Math.round(averagePerTrip * 100) / 100,
                highestMonthEarning: Math.round(highestMonthEarning * 100) / 100,
                lowestMonthEarning: Math.round(lowestMonthEarning * 100) / 100,
                totalTrips: totalRidesAllMonths
            },
            details
        };
    }
    else if (filter === 'yearly') {
        currentPeriodStart = new Date(now.getFullYear(), 0, 1);
        currentPeriodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        previousPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
        previousPeriodEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59, 999);
        periodLabel = `Year ${now.getFullYear()}`;
        const currentData = yield ride_model_1.Ride.aggregate([
            {
                $match: {
                    driver: driver._id,
                    status: ride_interface_1.RideStatus.COMPLETED,
                    "statusHistory.timestamp": {
                        $gte: new Date(now.getFullYear() - 5, 0, 1),
                        $lte: now
                    }
                }
            },
            { $unwind: "$statusHistory" },
            { $match: { "statusHistory.status": ride_interface_1.RideStatus.COMPLETED } },
            {
                $group: {
                    _id: {
                        year: { $year: "$statusHistory.timestamp" }
                    },
                    totalEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } },
                    rideCount: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1 } }
        ]);
        const previousData = yield ride_model_1.Ride.aggregate([
            {
                $match: {
                    driver: driver._id,
                    status: ride_interface_1.RideStatus.COMPLETED,
                    "statusHistory.timestamp": { $gte: previousPeriodStart, $lte: previousPeriodEnd }
                }
            },
            { $unwind: "$statusHistory" },
            { $match: { "statusHistory.status": ride_interface_1.RideStatus.COMPLETED } },
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } },
                    rideCount: { $sum: 1 }
                }
            }
        ]);
        const currentYearData = currentData.find(d => d._id.year === now.getFullYear());
        const currentTotalEarnings = (currentYearData === null || currentYearData === void 0 ? void 0 : currentYearData.totalEarnings) || 0;
        const currentTotalRides = (currentYearData === null || currentYearData === void 0 ? void 0 : currentYearData.rideCount) || 0;
        const previousTotalEarnings = previousData.length > 0 ? previousData[0].totalEarnings : 0;
        const previousTotalRides = previousData.length > 0 ? previousData[0].rideCount : 0;
        const earningsChange = previousTotalEarnings === 0
            ? (currentTotalEarnings > 0 ? 100 : 0)
            : ((currentTotalEarnings - previousTotalEarnings) / previousTotalEarnings) * 100;
        const ridesChange = previousTotalRides === 0
            ? (currentTotalRides > 0 ? 100 : 0)
            : ((currentTotalRides - previousTotalRides) / previousTotalRides) * 100;
        // Additional metrics (for all years)
        const highestYearEarning = currentData.length > 0 ? Math.max(...currentData.map(d => d.totalEarnings)) : 0;
        const lowestYearEarning = currentData.length > 0 ? Math.min(...currentData.map(d => d.totalEarnings)) : 0;
        const yearsWithRides = currentData.length;
        const totalEarningsAllYears = currentData.reduce((sum, d) => sum + d.totalEarnings, 0);
        const totalRidesAllYears = currentData.reduce((sum, d) => sum + d.rideCount, 0);
        const averagePerYear = yearsWithRides > 0 ? totalEarningsAllYears / yearsWithRides : 0;
        const averagePerTrip = currentTotalRides > 0 ? currentTotalEarnings / currentTotalRides : 0;
        const details = currentData.map(d => ({
            period: `${d._id.year}`,
            totalEarnings: Math.round(d.totalEarnings * 100) / 100,
            rideCount: d.rideCount
        }));
        return {
            periodLabel,
            summary: {
                currentEarnings: Math.round(currentTotalEarnings * 100) / 100,
                previousEarnings: Math.round(previousTotalEarnings * 100) / 100,
                earningsChange: Math.round(earningsChange * 100) / 100,
                earningsTrend: currentTotalEarnings >= previousTotalEarnings ? "up" : "down",
                currentRides: currentTotalRides,
                previousRides: previousTotalRides,
                ridesChange: Math.round(ridesChange * 100) / 100,
                ridesTrend: currentTotalRides >= previousTotalRides ? "up" : "down",
                averagePerYear: Math.round(averagePerYear * 100) / 100,
                averagePerTrip: Math.round(averagePerTrip * 100) / 100,
                highestYearEarning: Math.round(highestYearEarning * 100) / 100,
                lowestYearEarning: Math.round(lowestYearEarning * 100) / 100,
                totalTrips: totalRidesAllYears
            },
            details
        };
    }
    return {
        periodLabel: "",
        summary: {},
        details: []
    };
});
const getDriverPeakEarningHours = (token) => __awaiter(void 0, void 0, void 0, function* () {
    const driver = yield driver_model_1.Driver.findOne({ user: token.userId });
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver profile not found");
    }
    // Get completed rides for analysis (last 30 days for better insights)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const hourlyEarnings = yield ride_model_1.Ride.aggregate([
        {
            $match: {
                driver: driver._id,
                status: ride_interface_1.RideStatus.COMPLETED,
                "statusHistory.timestamp": { $gte: thirtyDaysAgo }
            }
        },
        { $unwind: "$statusHistory" },
        { $match: { "statusHistory.status": ride_interface_1.RideStatus.COMPLETED } },
        {
            $group: {
                _id: {
                    hour: { $hour: "$statusHistory.timestamp" }
                },
                totalEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } },
                rideCount: { $sum: 1 },
                averageEarning: { $avg: { $multiply: ["$finalFare", 0.75] } }
            }
        },
        { $sort: { "_id.hour": 1 } }
    ]);
    // Format hours (0-23) to readable format
    const formattedHourlyData = hourlyEarnings.map(item => {
        const hour = item._id.hour;
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return {
            hour: `${displayHour} ${period}`,
            hourValue: hour,
            totalEarnings: Math.round(item.totalEarnings * 100) / 100,
            rideCount: item.rideCount,
            averageEarning: Math.round(item.averageEarning * 100) / 100
        };
    });
    // Find peak metrics
    const peakHour = formattedHourlyData.length > 0
        ? formattedHourlyData.reduce((max, current) => current.totalEarnings > max.totalEarnings ? current : max)
        : { hour: 'N/A', totalEarnings: 0, rideCount: 0 };
    const busiestHour = formattedHourlyData.length > 0
        ? formattedHourlyData.reduce((max, current) => current.rideCount > max.rideCount ? current : max)
        : { hour: 'N/A', rideCount: 0, totalEarnings: 0 };
    const highestAvgHour = formattedHourlyData.length > 0
        ? formattedHourlyData.reduce((max, current) => current.averageEarning > max.averageEarning ? current : max)
        : { hour: 'N/A', averageEarning: 0, rideCount: 0 };
    return {
        peakHour: {
            hour: peakHour.hour,
            totalEarnings: peakHour.totalEarnings,
            rideCount: peakHour.rideCount
        },
        busiestHour: {
            hour: busiestHour.hour,
            rideCount: busiestHour.rideCount,
            totalEarnings: busiestHour.totalEarnings
        },
        highestAverageHour: {
            hour: highestAvgHour.hour,
            averageEarning: highestAvgHour.averageEarning,
            rideCount: highestAvgHour.rideCount
        },
        hourlyBreakdown: formattedHourlyData
    };
});
const getDriverTopEarningRoutes = (token) => __awaiter(void 0, void 0, void 0, function* () {
    const driver = yield driver_model_1.Driver.findOne({ user: token.userId });
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver profile not found");
    }
    // Get completed rides for analysis (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const routeEarnings = yield ride_model_1.Ride.aggregate([
        {
            $match: {
                driver: driver._id,
                status: ride_interface_1.RideStatus.COMPLETED,
                "statusHistory.timestamp": { $gte: thirtyDaysAgo }
            }
        },
        {
            $addFields: {
                pickupLng: { $arrayElemAt: ["$pickupLocation.coordinates", 0] },
                pickupLat: { $arrayElemAt: ["$pickupLocation.coordinates", 1] },
                dropOffLng: { $arrayElemAt: ["$dropOffLocation.coordinates", 0] },
                dropOffLat: { $arrayElemAt: ["$dropOffLocation.coordinates", 1] }
            }
        },
        {
            $addFields: {
                // Round coordinates to 2 decimal places to group nearby locations
                pickupArea: {
                    $concat: [
                        { $toString: { $round: ["$pickupLat", 2] } },
                        ",",
                        { $toString: { $round: ["$pickupLng", 2] } }
                    ]
                },
                dropOffArea: {
                    $concat: [
                        { $toString: { $round: ["$dropOffLat", 2] } },
                        ",",
                        { $toString: { $round: ["$dropOffLng", 2] } }
                    ]
                }
            }
        },
        {
            $group: {
                _id: {
                    pickupArea: "$pickupArea",
                    dropOffArea: "$dropOffArea",
                    pickupCoords: {
                        lng: { $round: ["$pickupLng", 2] },
                        lat: { $round: ["$pickupLat", 2] }
                    },
                    dropOffCoords: {
                        lng: { $round: ["$dropOffLng", 2] },
                        lat: { $round: ["$dropOffLat", 2] }
                    }
                },
                totalEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } },
                rideCount: { $sum: 1 },
                averageEarning: { $avg: { $multiply: ["$finalFare", 0.75] } },
                averageDistance: { $avg: "$distance" },
                averageDuration: { $avg: "$duration" }
            }
        },
        { $sort: { totalEarnings: -1 } },
        { $limit: 10 }
    ]);
    // Format route data
    const topRoutes = routeEarnings.map((route, index) => ({
        rank: index + 1,
        route: `[${route._id.pickupCoords.lat}, ${route._id.pickupCoords.lng}] → [${route._id.dropOffCoords.lat}, ${route._id.dropOffCoords.lng}]`,
        pickupLocation: {
            coordinates: {
                latitude: route._id.pickupCoords.lat,
                longitude: route._id.pickupCoords.lng
            },
            area: route._id.pickupArea
        },
        dropOffLocation: {
            coordinates: {
                latitude: route._id.dropOffCoords.lat,
                longitude: route._id.dropOffCoords.lng
            },
            area: route._id.dropOffArea
        },
        totalEarnings: Math.round(route.totalEarnings * 100) / 100,
        rideCount: route.rideCount,
        averageEarning: Math.round(route.averageEarning * 100) / 100,
        averageDistance: Math.round(route.averageDistance * 100) / 100,
        averageDuration: Math.round(route.averageDuration * 100) / 100
    }));
    // Calculate summary statistics
    const totalRoutesAnalyzed = routeEarnings.length;
    const topRoute = topRoutes.length > 0 ? topRoutes[0] : null;
    const totalEarningsFromTopRoutes = topRoutes.reduce((sum, r) => sum + r.totalEarnings, 0);
    const totalRidesFromTopRoutes = topRoutes.reduce((sum, r) => sum + r.rideCount, 0);
    // Find most frequent pickup and dropoff coordinates
    const pickupAreas = yield ride_model_1.Ride.aggregate([
        {
            $match: {
                driver: driver._id,
                status: ride_interface_1.RideStatus.COMPLETED,
                "statusHistory.timestamp": { $gte: thirtyDaysAgo }
            }
        },
        {
            $addFields: {
                pickupLng: { $arrayElemAt: ["$pickupLocation.coordinates", 0] },
                pickupLat: { $arrayElemAt: ["$pickupLocation.coordinates", 1] }
            }
        },
        {
            $addFields: {
                pickupArea: {
                    $concat: [
                        { $toString: { $round: ["$pickupLat", 2] } },
                        ",",
                        { $toString: { $round: ["$pickupLng", 2] } }
                    ]
                }
            }
        },
        {
            $group: {
                _id: {
                    area: "$pickupArea",
                    coords: {
                        lng: { $round: ["$pickupLng", 2] },
                        lat: { $round: ["$pickupLat", 2] }
                    }
                },
                count: { $sum: 1 },
                totalEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);
    const dropOffAreas = yield ride_model_1.Ride.aggregate([
        {
            $match: {
                driver: driver._id,
                status: ride_interface_1.RideStatus.COMPLETED,
                "statusHistory.timestamp": { $gte: thirtyDaysAgo }
            }
        },
        {
            $addFields: {
                dropOffLng: { $arrayElemAt: ["$dropOffLocation.coordinates", 0] },
                dropOffLat: { $arrayElemAt: ["$dropOffLocation.coordinates", 1] }
            }
        },
        {
            $addFields: {
                dropOffArea: {
                    $concat: [
                        { $toString: { $round: ["$dropOffLat", 2] } },
                        ",",
                        { $toString: { $round: ["$dropOffLng", 2] } }
                    ]
                }
            }
        },
        {
            $group: {
                _id: {
                    area: "$dropOffArea",
                    coords: {
                        lng: { $round: ["$dropOffLng", 2] },
                        lat: { $round: ["$dropOffLat", 2] }
                    }
                },
                count: { $sum: 1 },
                totalEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);
    return {
        summary: {
            totalRoutesAnalyzed,
            topRoute: topRoute ? {
                route: topRoute.route,
                totalEarnings: topRoute.totalEarnings,
                rideCount: topRoute.rideCount
            } : null,
            totalEarningsFromTopRoutes: Math.round(totalEarningsFromTopRoutes * 100) / 100,
            totalRidesFromTopRoutes
        },
        topRoutes,
        topPickupAreas: pickupAreas.map((area, index) => ({
            rank: index + 1,
            coordinates: {
                latitude: area._id.coords.lat,
                longitude: area._id.coords.lng
            },
            area: area._id.area,
            rideCount: area.count,
            totalEarnings: Math.round(area.totalEarnings * 100) / 100
        })),
        topDropOffAreas: dropOffAreas.map((area, index) => ({
            rank: index + 1,
            coordinates: {
                latitude: area._id.coords.lat,
                longitude: area._id.coords.lng
            },
            area: area._id.area,
            rideCount: area.count,
            totalEarnings: Math.round(area.totalEarnings * 100) / 100
        }))
    };
});
exports.DriverService = {
    createDriver,
    getAllDrivers,
    driverApprovedStatusChange,
    driverStatusChange,
    driverLocationUpdate,
    getDriverEarningsHistory,
    driverSuspendedStatusChange,
    updateDriverRating,
    getMyDriverProfile,
    getDriverDashboardMetrics,
    getDriverEarningsAnalytics,
    getDriverPeakEarningHours,
    getDriverTopEarningRoutes
};
