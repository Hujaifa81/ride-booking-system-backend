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
exports.Analytics = exports.getSystemFunnel = exports.getCancellationBreakdown = exports.getTopRiders = exports.makeRideMatch = void 0;
exports.getTopDrivers = getTopDrivers;
const ride_interface_1 = require("../ride/ride.interface");
const ride_model_1 = require("../ride/ride.model");
const user_interface_1 = require("../user/user.interface");
const user_model_1 = require("../user/user.model");
/**
 * Build a MongoDB $match query based on filters.
 */
const makeRideMatch = ({ from, to, driverId, userId }) => {
    const match = {};
    if (from || to) {
        match.createdAt = {};
        if (from)
            match.createdAt.$gte = new Date(from);
        if (to)
            match.createdAt.$lte = new Date(to);
    }
    if (driverId)
        match.driver = driverId;
    if (userId)
        match.user = userId;
    return match;
};
exports.makeRideMatch = makeRideMatch;
/**
 * Calculate trend percentage and direction
 */
const calculateTrend = (current, previous) => {
    if (previous === 0)
        return {
            value: current > 0 ? 100 : 0,
            direction: current > 0 ? "up" : "neutral"
        };
    const value = Number((((current - previous) / previous) * 100).toFixed(2));
    return {
        value: Math.abs(value),
        direction: value > 0 ? "up" : value < 0 ? "down" : "neutral"
    };
};
/**
 * Calculate previous period dates
 */
const getPreviousPeriod = (start, end) => {
    const duration = end.getTime() - start.getTime();
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - duration);
    return { previousStart, previousEnd };
};
/* ---------------- DASHBOARD SUMMARY ---------------- */
const getDashboardSummary = (filteredDate) => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    let currentPeriodStart;
    let currentPeriodEnd;
    if (filteredDate.from && filteredDate.to) {
        currentPeriodStart = new Date(filteredDate.from);
        currentPeriodEnd = new Date(filteredDate.to);
    }
    else if (filteredDate.from && !filteredDate.to) {
        currentPeriodStart = new Date(filteredDate.from);
        currentPeriodEnd = now;
    }
    else if (!filteredDate.from && filteredDate.to) {
        currentPeriodEnd = new Date(filteredDate.to);
        currentPeriodStart = new Date(currentPeriodEnd.getTime() - (30 * 24 * 60 * 60 * 1000));
    }
    else {
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentPeriodEnd = now;
    }
    const rideMatch = (0, exports.makeRideMatch)({
        from: currentPeriodStart.toISOString(),
        to: currentPeriodEnd.toISOString(),
        driverId: filteredDate.driverId,
        userId: filteredDate.userId,
    });
    const periodDuration = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
    const { previousStart: previousPeriodStart, previousEnd: previousPeriodEnd } = getPreviousPeriod(currentPeriodStart, currentPeriodEnd);
    const previousMatch = {
        createdAt: {
            $gte: previousPeriodStart,
            $lte: previousPeriodEnd
        }
    };
    if (filteredDate.driverId)
        previousMatch.driver = filteredDate.driverId;
    if (filteredDate.userId)
        previousMatch.user = filteredDate.userId;
    const [totalUsers, totalDrivers, totalRiders, totalAdmins, activeDrivers, activeRiders, completedRides, cancelledRides, activeRides, revenueData, newUsers, newDrivers, newRiders, newAdmins, previousCompletedRides, previousCancelledRides, previousRevenueData, previousActiveDrivers, previousActiveRiders, previousNewUsers, previousNewDrivers, previousNewRiders, previousNewAdmins,] = yield Promise.all([
        user_model_1.User.countDocuments(),
        user_model_1.User.countDocuments({ role: user_interface_1.Role.DRIVER }),
        user_model_1.User.countDocuments({ role: user_interface_1.Role.RIDER }),
        user_model_1.User.countDocuments({ role: user_interface_1.Role.ADMIN }),
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, rideMatch), { status: ride_interface_1.RideStatus.COMPLETED, driver: { $ne: null } }) },
            { $group: { _id: "$driver" } },
            { $count: "count" }
        ]).then(result => { var _a; return ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.count) || 0; }),
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, rideMatch), { status: ride_interface_1.RideStatus.COMPLETED, user: { $ne: null } }) },
            { $group: { _id: "$user" } },
            { $count: "count" }
        ]).then(result => { var _a; return ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.count) || 0; }),
        ride_model_1.Ride.countDocuments(Object.assign(Object.assign({}, rideMatch), { status: ride_interface_1.RideStatus.COMPLETED })),
        ride_model_1.Ride.countDocuments(Object.assign(Object.assign({}, rideMatch), { status: {
                $in: [
                    ride_interface_1.RideStatus.CANCELLED_BY_ADMIN,
                    ride_interface_1.RideStatus.CANCELLED_BY_DRIVER,
                    ride_interface_1.RideStatus.CANCELLED_BY_RIDER,
                    ride_interface_1.RideStatus.CANCELLED_FOR_PENDING_TIME_OVER,
                ]
            } })),
        ride_model_1.Ride.countDocuments({
            status: {
                $in: [
                    ride_interface_1.RideStatus.REQUESTED,
                    ride_interface_1.RideStatus.ACCEPTED,
                    ride_interface_1.RideStatus.GOING_TO_PICK_UP,
                    ride_interface_1.RideStatus.DRIVER_ARRIVED,
                    ride_interface_1.RideStatus.IN_TRANSIT,
                    ride_interface_1.RideStatus.REACHED_DESTINATION,
                ]
            }
        }),
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, rideMatch), { status: ride_interface_1.RideStatus.COMPLETED }) },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$finalFare" },
                    platformRevenue: { $sum: { $multiply: ["$finalFare", 0.25] } },
                    driverEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } },
                }
            }
        ]).then(result => result[0] || { totalRevenue: 0, platformRevenue: 0, driverEarnings: 0 }),
        user_model_1.User.countDocuments({
            createdAt: { $gte: currentPeriodStart, $lte: currentPeriodEnd }
        }),
        user_model_1.User.countDocuments({
            role: user_interface_1.Role.DRIVER,
            createdAt: { $gte: currentPeriodStart, $lte: currentPeriodEnd }
        }),
        user_model_1.User.countDocuments({
            role: user_interface_1.Role.RIDER,
            createdAt: { $gte: currentPeriodStart, $lte: currentPeriodEnd }
        }),
        user_model_1.User.countDocuments({
            role: user_interface_1.Role.ADMIN,
            createdAt: { $gte: currentPeriodStart, $lte: currentPeriodEnd }
        }),
        ride_model_1.Ride.countDocuments(Object.assign(Object.assign({}, previousMatch), { status: ride_interface_1.RideStatus.COMPLETED })),
        ride_model_1.Ride.countDocuments(Object.assign(Object.assign({}, previousMatch), { status: {
                $in: [
                    ride_interface_1.RideStatus.CANCELLED_BY_ADMIN,
                    ride_interface_1.RideStatus.CANCELLED_BY_DRIVER,
                    ride_interface_1.RideStatus.CANCELLED_BY_RIDER,
                    ride_interface_1.RideStatus.CANCELLED_FOR_PENDING_TIME_OVER,
                ]
            } })),
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, previousMatch), { status: ride_interface_1.RideStatus.COMPLETED }) },
            { $group: { _id: null, totalRevenue: { $sum: "$finalFare" } } }
        ]).then(result => result[0] || { totalRevenue: 0 }),
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, previousMatch), { status: ride_interface_1.RideStatus.COMPLETED, driver: { $ne: null } }) },
            { $group: { _id: "$driver" } },
            { $count: "count" }
        ]).then(result => { var _a; return ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.count) || 0; }),
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, previousMatch), { status: ride_interface_1.RideStatus.COMPLETED, user: { $ne: null } }) },
            { $group: { _id: "$user" } },
            { $count: "count" }
        ]).then(result => { var _a; return ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.count) || 0; }),
        user_model_1.User.countDocuments({
            createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd }
        }),
        user_model_1.User.countDocuments({
            role: user_interface_1.Role.DRIVER,
            createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd }
        }),
        user_model_1.User.countDocuments({
            role: user_interface_1.Role.RIDER,
            createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd }
        }),
        user_model_1.User.countDocuments({
            role: user_interface_1.Role.ADMIN,
            createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd }
        }),
    ]);
    const revenueTrend = calculateTrend(revenueData.totalRevenue, previousRevenueData.totalRevenue);
    const completedRidesTrend = calculateTrend(completedRides, previousCompletedRides);
    const cancelledRidesTrend = calculateTrend(cancelledRides, previousCancelledRides);
    const activeDriversTrend = calculateTrend(activeDrivers, previousActiveDrivers);
    const activeRidersTrend = calculateTrend(activeRiders, previousActiveRiders);
    const newUsersTrend = calculateTrend(newUsers, previousNewUsers);
    const newDriversTrend = calculateTrend(newDrivers, previousNewDrivers);
    const newRidersTrend = calculateTrend(newRiders, previousNewRiders);
    const newAdminsTrend = calculateTrend(newAdmins, previousNewAdmins);
    const durationInDays = Math.ceil(periodDuration / (1000 * 60 * 60 * 24));
    return {
        overview: {
            totalUsers: {
                count: totalUsers,
                label: "Total Users",
                icon: "users"
            },
            totalDrivers: {
                count: totalDrivers,
                label: "Total Drivers",
                icon: "car"
            },
            totalRiders: {
                count: totalRiders,
                label: "Total Riders",
                icon: "user"
            },
            activeRides: {
                count: activeRides,
                label: "Active Rides",
                icon: "activity",
                status: "in-progress"
            }
        },
        revenue: {
            total: Math.round(revenueData.totalRevenue * 100) / 100,
            platform: Math.round(revenueData.platformRevenue * 100) / 100,
            drivers: Math.round(revenueData.driverEarnings * 100) / 100,
            trend: revenueTrend.value,
            trendDirection: revenueTrend.direction,
            previousPeriod: Math.round(previousRevenueData.totalRevenue * 100) / 100,
        },
        users: {
            total: totalUsers,
            drivers: totalDrivers,
            riders: totalRiders,
            admins: totalAdmins,
            new: newUsers,
            newDrivers: newDrivers,
            newRiders: newRiders,
            newAdmins: newAdmins,
            trend: newUsersTrend.value,
            trendDirection: newUsersTrend.direction,
            previousPeriod: previousNewUsers,
        },
        drivers: {
            total: totalDrivers,
            active: activeDrivers,
            activePercentage: totalDrivers > 0 ? Math.round((activeDrivers / totalDrivers) * 100) : 0,
            new: newDrivers,
            trend: newDriversTrend.value,
            trendDirection: newDriversTrend.direction,
            previousPeriod: previousNewDrivers,
            activeTrend: activeDriversTrend.value,
            activeTrendDirection: activeDriversTrend.direction,
            previousActivePeriod: previousActiveDrivers,
        },
        riders: {
            total: totalRiders,
            active: activeRiders,
            activePercentage: totalRiders > 0 ? Math.round((activeRiders / totalRiders) * 100) : 0,
            new: newRiders,
            trend: newRidersTrend.value,
            trendDirection: newRidersTrend.direction,
            previousPeriod: previousNewRiders,
            activeTrend: activeRidersTrend.value,
            activeTrendDirection: activeRidersTrend.direction,
            previousActivePeriod: previousActiveRiders,
        },
        admins: {
            total: totalAdmins,
            new: newAdmins,
            trend: newAdminsTrend.value,
            trendDirection: newAdminsTrend.direction,
            previousPeriod: previousNewAdmins,
        },
        rides: {
            completed: {
                count: completedRides,
                trend: completedRidesTrend.value,
                trendDirection: completedRidesTrend.direction,
                previousPeriod: previousCompletedRides,
            },
            cancelled: {
                count: cancelledRides,
                trend: cancelledRidesTrend.value,
                trendDirection: cancelledRidesTrend.direction,
                previousPeriod: previousCancelledRides,
                rate: completedRides + cancelledRides > 0
                    ? Math.round((cancelledRides / (completedRides + cancelledRides)) * 100)
                    : 0,
            },
            active: activeRides,
            total: completedRides + cancelledRides + activeRides,
        },
        period: {
            from: currentPeriodStart.toISOString(),
            to: currentPeriodEnd.toISOString(),
            previousFrom: previousPeriodStart.toISOString(),
            previousTo: previousPeriodEnd.toISOString(),
            duration: `${durationInDays} ${durationInDays === 1 ? 'day' : 'days'}`,
        }
    };
});
/* ---------------- ADVANCED ANALYTICS BY METRIC ---------------- */
const getAdvancedAnalytics = (from_1, to_1, ...args_1) => __awaiter(void 0, [from_1, to_1, ...args_1], void 0, function* (from, to, metric = "rides") {
    const now = new Date();
    // Handle different date scenarios
    let currentStart;
    let currentEnd;
    if (from && to) {
        // Both dates provided
        currentStart = new Date(from);
        currentEnd = new Date(to);
    }
    else if (from && !to) {
        // Only 'from' provided - use from date to now
        currentStart = new Date(from);
        currentEnd = now;
    }
    else if (!from && to) {
        // Only 'to' provided - use 30 days before 'to' date
        currentEnd = new Date(to);
        currentStart = new Date(currentEnd.getTime() - (30 * 24 * 60 * 60 * 1000));
    }
    else {
        // No dates provided - use current month
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = now;
    }
    // Build range for filters
    const range = {
        from: currentStart.toISOString(),
        to: currentEnd.toISOString()
    };
    // Calculate previous period
    const { previousStart, previousEnd } = getPreviousPeriod(currentStart, currentEnd);
    // Build matches
    const rideMatch = (0, exports.makeRideMatch)(range);
    const previousRideMatch = (0, exports.makeRideMatch)({
        from: previousStart.toISOString(),
        to: previousEnd.toISOString()
    });
    // Route to appropriate analytics function
    switch (metric) {
        case "rides":
            return yield getRidesAnalytics(rideMatch, previousRideMatch);
        case "revenue":
            return yield getRevenueAnalytics(rideMatch, previousRideMatch);
        case "drivers":
            return yield getDriversAnalytics(rideMatch, previousRideMatch, range, currentStart, currentEnd, previousStart, previousEnd);
        case "riders":
            return yield getRidersAnalytics(rideMatch, previousRideMatch, range, currentStart, currentEnd, previousStart, previousEnd);
        case "users":
            return yield getUsersAnalytics(currentStart, currentEnd, previousStart, previousEnd);
        default:
            throw new Error("Invalid metric type");
    }
});
/* ---------------- RIDES ANALYTICS ---------------- */
const getRidesAnalytics = (currentMatch, previousMatch) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const [
    // Current period
    totalRides, completedRides, cancelledRides, ongoingRides, ridesByStatus, 
    // Hourly distribution
    hourlyDistribution, 
    // Daily trends (last 30 days)
    dailyTrends, 
    // Monthly trends (last 12 months)
    monthlyTrends, 
    // Previous period
    previousTotalRides, previousCompletedRides, previousCancelledRides, 
    // Cancellation reasons
    cancellationReasons, 
    // Average ride metrics
    avgMetrics,] = yield Promise.all([
        // Current totals
        ride_model_1.Ride.countDocuments(currentMatch),
        ride_model_1.Ride.countDocuments(Object.assign(Object.assign({}, currentMatch), { status: ride_interface_1.RideStatus.COMPLETED })),
        ride_model_1.Ride.countDocuments(Object.assign(Object.assign({}, currentMatch), { status: {
                $in: [
                    ride_interface_1.RideStatus.CANCELLED_BY_ADMIN,
                    ride_interface_1.RideStatus.CANCELLED_BY_DRIVER,
                    ride_interface_1.RideStatus.CANCELLED_BY_RIDER,
                    ride_interface_1.RideStatus.CANCELLED_FOR_PENDING_TIME_OVER,
                ]
            } })),
        ride_model_1.Ride.countDocuments({
            status: {
                $in: [
                    ride_interface_1.RideStatus.REQUESTED,
                    ride_interface_1.RideStatus.ACCEPTED,
                    ride_interface_1.RideStatus.GOING_TO_PICK_UP,
                    ride_interface_1.RideStatus.DRIVER_ARRIVED,
                    ride_interface_1.RideStatus.IN_TRANSIT,
                    ride_interface_1.RideStatus.REACHED_DESTINATION,
                ]
            }
        }),
        // Rides by status
        ride_model_1.Ride.aggregate([
            { $match: currentMatch },
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        // Hourly distribution
        ride_model_1.Ride.aggregate([
            { $match: currentMatch },
            {
                $group: {
                    _id: { $hour: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),
        // Daily trends
        ride_model_1.Ride.aggregate([
            { $match: currentMatch },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalRides: { $sum: 1 },
                    completedRides: {
                        $sum: { $cond: [{ $eq: ["$status", ride_interface_1.RideStatus.COMPLETED] }, 1, 0] }
                    },
                    cancelledRides: {
                        $sum: {
                            $cond: [
                                {
                                    $in: [
                                        "$status",
                                        [
                                            ride_interface_1.RideStatus.CANCELLED_BY_ADMIN,
                                            ride_interface_1.RideStatus.CANCELLED_BY_DRIVER,
                                            ride_interface_1.RideStatus.CANCELLED_BY_RIDER,
                                            ride_interface_1.RideStatus.CANCELLED_FOR_PENDING_TIME_OVER,
                                        ]
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]),
        // Monthly trends
        ride_model_1.Ride.aggregate([
            { $match: currentMatch },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    totalRides: { $sum: 1 },
                    completedRides: {
                        $sum: { $cond: [{ $eq: ["$status", ride_interface_1.RideStatus.COMPLETED] }, 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]),
        // Previous period totals
        ride_model_1.Ride.countDocuments(previousMatch),
        ride_model_1.Ride.countDocuments(Object.assign(Object.assign({}, previousMatch), { status: ride_interface_1.RideStatus.COMPLETED })),
        ride_model_1.Ride.countDocuments(Object.assign(Object.assign({}, previousMatch), { status: {
                $in: [
                    ride_interface_1.RideStatus.CANCELLED_BY_ADMIN,
                    ride_interface_1.RideStatus.CANCELLED_BY_DRIVER,
                    ride_interface_1.RideStatus.CANCELLED_BY_RIDER,
                    ride_interface_1.RideStatus.CANCELLED_FOR_PENDING_TIME_OVER,
                ]
            } })),
        // Cancellation reasons
        ride_model_1.Ride.aggregate([
            {
                $match: Object.assign(Object.assign({}, currentMatch), { status: {
                        $in: [
                            ride_interface_1.RideStatus.CANCELLED_BY_ADMIN,
                            ride_interface_1.RideStatus.CANCELLED_BY_DRIVER,
                            ride_interface_1.RideStatus.CANCELLED_BY_RIDER,
                            ride_interface_1.RideStatus.CANCELLED_FOR_PENDING_TIME_OVER,
                        ]
                    } })
            },
            { $group: { _id: "$canceledReason", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        // Average metrics
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, currentMatch), { status: ride_interface_1.RideStatus.COMPLETED }) },
            {
                $group: {
                    _id: null,
                    avgFare: { $avg: "$finalFare" },
                    avgDistance: { $avg: "$distance" },
                    avgDuration: { $avg: "$duration" }
                }
            }
        ]),
    ]);
    const totalTrend = calculateTrend(totalRides, previousTotalRides);
    const completedTrend = calculateTrend(completedRides, previousCompletedRides);
    const cancelledTrend = calculateTrend(cancelledRides, previousCancelledRides);
    return {
        summary: {
            total: {
                count: totalRides,
                trend: totalTrend.value,
                trendDirection: totalTrend.direction,
                previousPeriod: previousTotalRides
            },
            completed: {
                count: completedRides,
                percentage: totalRides > 0 ? Math.round((completedRides / totalRides) * 100) : 0,
                trend: completedTrend.value,
                trendDirection: completedTrend.direction,
                previousPeriod: previousCompletedRides
            },
            cancelled: {
                count: cancelledRides,
                percentage: totalRides > 0 ? Math.round((cancelledRides / totalRides) * 100) : 0,
                trend: cancelledTrend.value,
                trendDirection: cancelledTrend.direction,
                previousPeriod: previousCancelledRides
            },
            ongoing: {
                count: ongoingRides
            }
        },
        statusBreakdown: ridesByStatus.map(s => ({
            status: s._id,
            count: s.count,
            percentage: totalRides > 0 ? Math.round((s.count / totalRides) * 100) : 0
        })),
        hourlyDistribution: hourlyDistribution.map(h => ({
            hour: h._id,
            count: h.count
        })),
        dailyTrends: dailyTrends.map(d => ({
            date: d._id,
            total: d.totalRides,
            completed: d.completedRides,
            cancelled: d.cancelledRides,
            completionRate: d.totalRides > 0 ? Math.round((d.completedRides / d.totalRides) * 100) : 0
        })),
        monthlyTrends: monthlyTrends.map(m => ({
            month: m._id,
            total: m.totalRides,
            completed: m.completedRides
        })),
        cancellationReasons: cancellationReasons.map(c => ({
            reason: c._id || "UNKNOWN",
            count: c.count,
            percentage: cancelledRides > 0 ? Math.round((c.count / cancelledRides) * 100) : 0
        })),
        averages: {
            fare: ((_a = avgMetrics[0]) === null || _a === void 0 ? void 0 : _a.avgFare) ? Math.round(avgMetrics[0].avgFare * 100) / 100 : 0,
            distance: ((_b = avgMetrics[0]) === null || _b === void 0 ? void 0 : _b.avgDistance) ? Math.round(avgMetrics[0].avgDistance * 100) / 100 : 0,
            duration: ((_c = avgMetrics[0]) === null || _c === void 0 ? void 0 : _c.avgDuration) ? Math.round(avgMetrics[0].avgDuration) : 0
        }
    };
});
/* ---------------- REVENUE ANALYTICS ---------------- */
const getRevenueAnalytics = (currentMatch, previousMatch) => __awaiter(void 0, void 0, void 0, function* () {
    const [currentRevenue, previousRevenue, dailyRevenue, monthlyRevenue, revenueByVehicleType, topRevenueDrivers,] = yield Promise.all([
        // Current period revenue
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, currentMatch), { status: ride_interface_1.RideStatus.COMPLETED }) },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$finalFare" },
                    platformRevenue: { $sum: { $multiply: ["$finalFare", 0.25] } },
                    driverEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } },
                    avgFare: { $avg: "$finalFare" },
                    totalRides: { $sum: 1 }
                }
            }
        ]),
        // Previous period revenue
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, previousMatch), { status: ride_interface_1.RideStatus.COMPLETED }) },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$finalFare" }
                }
            }
        ]),
        // Daily revenue trends
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, currentMatch), { status: ride_interface_1.RideStatus.COMPLETED }) },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    grossRevenue: { $sum: "$finalFare" },
                    platformRevenue: { $sum: { $multiply: ["$finalFare", 0.25] } },
                    driverEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } },
                    rides: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),
        // Monthly revenue trends
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, currentMatch), { status: ride_interface_1.RideStatus.COMPLETED }) },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    grossRevenue: { $sum: "$finalFare" },
                    platformRevenue: { $sum: { $multiply: ["$finalFare", 0.25] } },
                    rides: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),
        // Revenue by vehicle type
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, currentMatch), { status: ride_interface_1.RideStatus.COMPLETED }) },
            {
                $lookup: {
                    from: "vehicles",
                    localField: "vehicle",
                    foreignField: "_id",
                    as: "vehicleInfo"
                }
            },
            { $unwind: { path: "$vehicleInfo", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$vehicleInfo.vehicleType",
                    revenue: { $sum: "$finalFare" },
                    rides: { $sum: 1 }
                }
            },
            { $sort: { revenue: -1 } }
        ]),
        // Top revenue generating drivers
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, currentMatch), { status: ride_interface_1.RideStatus.COMPLETED, driver: { $ne: null } }) },
            {
                $group: {
                    _id: "$driver",
                    totalRevenue: { $sum: "$finalFare" },
                    driverEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } },
                    rides: { $sum: 1 }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "drivers",
                    localField: "_id",
                    foreignField: "_id",
                    as: "driver"
                }
            },
            { $unwind: "$driver" }
        ]),
    ]);
    const current = currentRevenue[0] || { totalRevenue: 0, platformRevenue: 0, driverEarnings: 0, avgFare: 0, totalRides: 0 };
    const previous = previousRevenue[0] || { totalRevenue: 0 };
    const revenueTrend = calculateTrend(current.totalRevenue, previous.totalRevenue);
    return {
        summary: {
            total: {
                amount: Math.round(current.totalRevenue * 100) / 100,
                trend: revenueTrend.value,
                trendDirection: revenueTrend.direction,
                previousPeriod: Math.round(previous.totalRevenue * 100) / 100
            },
            platform: {
                amount: Math.round(current.platformRevenue * 100) / 100,
                percentage: 25
            },
            drivers: {
                amount: Math.round(current.driverEarnings * 100) / 100,
                percentage: 75
            },
            averageFare: Math.round(current.avgFare * 100) / 100,
            totalRides: current.totalRides
        },
        dailyTrends: dailyRevenue.map(d => ({
            date: d._id,
            gross: Math.round(d.grossRevenue * 100) / 100,
            platform: Math.round(d.platformRevenue * 100) / 100,
            driver: Math.round(d.driverEarnings * 100) / 100,
            rides: d.rides
        })),
        monthlyTrends: monthlyRevenue.map(m => ({
            month: m._id,
            gross: Math.round(m.grossRevenue * 100) / 100,
            platform: Math.round(m.platformRevenue * 100) / 100,
            rides: m.rides
        })),
        byVehicleType: revenueByVehicleType.map(v => ({
            vehicleType: v._id || "UNKNOWN",
            revenue: Math.round(v.revenue * 100) / 100,
            rides: v.rides,
            avgFare: v.rides > 0 ? Math.round((v.revenue / v.rides) * 100) / 100 : 0
        })),
        topDrivers: topRevenueDrivers.map(d => ({
            driverId: d._id,
            totalRevenue: Math.round(d.totalRevenue * 100) / 100,
            earnings: Math.round(d.driverEarnings * 100) / 100,
            rides: d.rides,
            avgFare: d.rides > 0 ? Math.round((d.totalRevenue / d.rides) * 100) / 100 : 0
        }))
    };
});
/* ---------------- DRIVERS ANALYTICS ---------------- */
const getDriversAnalytics = (currentMatch, previousMatch, range, currentStart, currentEnd, previousStart, previousEnd) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const [totalDrivers, activeDrivers, previousActiveDrivers, newDrivers, previousNewDrivers, driverPerformance, driversByStatus, topDriversByRides, topDriversByRevenue, dailyActiveDrivers,] = yield Promise.all([
        user_model_1.User.countDocuments({ role: user_interface_1.Role.DRIVER }),
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, currentMatch), { status: ride_interface_1.RideStatus.COMPLETED, driver: { $ne: null } }) },
            { $group: { _id: "$driver" } },
            { $count: "count" }
        ]).then(result => { var _a; return ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.count) || 0; }),
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, previousMatch), { status: ride_interface_1.RideStatus.COMPLETED, driver: { $ne: null } }) },
            { $group: { _id: "$driver" } },
            { $count: "count" }
        ]).then(result => { var _a; return ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.count) || 0; }),
        user_model_1.User.countDocuments({
            role: user_interface_1.Role.DRIVER,
            createdAt: { $gte: currentStart, $lte: currentEnd }
        }),
        user_model_1.User.countDocuments({
            role: user_interface_1.Role.DRIVER,
            createdAt: { $gte: previousStart, $lte: previousEnd }
        }),
        // Driver performance metrics
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, currentMatch), { driver: { $ne: null } }) },
            {
                $group: {
                    _id: "$driver",
                    totalRides: { $sum: 1 },
                    completedRides: {
                        $sum: { $cond: [{ $eq: ["$status", ride_interface_1.RideStatus.COMPLETED] }, 1, 0] }
                    },
                    cancelledRides: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", ride_interface_1.RideStatus.CANCELLED_BY_DRIVER] },
                                1,
                                0
                            ]
                        }
                    },
                    totalRevenue: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", ride_interface_1.RideStatus.COMPLETED] },
                                "$finalFare",
                                0
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    totalRides: 1,
                    completedRides: 1,
                    cancelledRides: 1,
                    totalRevenue: 1,
                    completionRate: {
                        $multiply: [
                            { $divide: ["$completedRides", "$totalRides"] },
                            100
                        ]
                    }
                }
            }
        ]),
        // Drivers by approval status
        user_model_1.User.aggregate([
            { $match: { role: user_interface_1.Role.DRIVER } },
            { $group: { _id: "$isApproved", count: { $sum: 1 } } }
        ]),
        // Top drivers by rides
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, currentMatch), { status: ride_interface_1.RideStatus.COMPLETED, driver: { $ne: null } }) },
            { $group: { _id: "$driver", rides: { $sum: 1 } } },
            { $sort: { rides: -1 } },
            { $limit: 10 }
        ]),
        // Top drivers by revenue
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, currentMatch), { status: ride_interface_1.RideStatus.COMPLETED, driver: { $ne: null } }) },
            {
                $group: {
                    _id: "$driver",
                    revenue: { $sum: "$finalFare" },
                    rides: { $sum: 1 }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 }
        ]),
        // Daily active drivers
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, currentMatch), { status: ride_interface_1.RideStatus.COMPLETED, driver: { $ne: null } }) },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        driver: "$driver"
                    }
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    activeDrivers: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),
    ]);
    const activeTrend = calculateTrend(activeDrivers, previousActiveDrivers);
    const newDriversTrend = calculateTrend(newDrivers, previousNewDrivers);
    const approved = ((_a = driversByStatus.find(d => d._id === true)) === null || _a === void 0 ? void 0 : _a.count) || 0;
    const pending = ((_b = driversByStatus.find(d => d._id === false)) === null || _b === void 0 ? void 0 : _b.count) || 0;
    return {
        summary: {
            total: totalDrivers,
            active: {
                count: activeDrivers,
                percentage: totalDrivers > 0 ? Math.round((activeDrivers / totalDrivers) * 100) : 0,
                trend: activeTrend.value,
                trendDirection: activeTrend.direction,
                previousPeriod: previousActiveDrivers
            },
            new: {
                count: newDrivers,
                trend: newDriversTrend.value,
                trendDirection: newDriversTrend.direction,
                previousPeriod: previousNewDrivers
            },
            approved: {
                count: approved,
                percentage: totalDrivers > 0 ? Math.round((approved / totalDrivers) * 100) : 0
            },
            pending: {
                count: pending,
                percentage: totalDrivers > 0 ? Math.round((pending / totalDrivers) * 100) : 0
            }
        },
        performance: {
            averageRides: driverPerformance.length > 0
                ? Math.round(driverPerformance.reduce((sum, d) => sum + d.totalRides, 0) / driverPerformance.length)
                : 0,
            averageCompletionRate: driverPerformance.length > 0
                ? Math.round(driverPerformance.reduce((sum, d) => sum + d.completionRate, 0) / driverPerformance.length)
                : 0,
            averageRevenue: driverPerformance.length > 0
                ? Math.round((driverPerformance.reduce((sum, d) => sum + d.totalRevenue, 0) / driverPerformance.length) * 100) / 100
                : 0
        },
        topByRides: topDriversByRides.map(d => ({
            driverId: d._id,
            rides: d.rides
        })),
        topByRevenue: topDriversByRevenue.map(d => ({
            driverId: d._id,
            revenue: Math.round(d.revenue * 100) / 100,
            rides: d.rides
        })),
        dailyActiveDrivers: dailyActiveDrivers.map(d => ({
            date: d._id,
            count: d.activeDrivers
        }))
    };
});
/* ---------------- RIDERS ANALYTICS ---------------- */
const getRidersAnalytics = (currentMatch, previousMatch, range, currentStart, currentEnd, previousStart, previousEnd) => __awaiter(void 0, void 0, void 0, function* () {
    const [totalRiders, activeRiders, previousActiveRiders, newRiders, previousNewRiders, topRidersBySpending, topRidersByTrips, riderEngagement, dailyActiveRiders,] = yield Promise.all([
        user_model_1.User.countDocuments({ role: user_interface_1.Role.RIDER }),
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, currentMatch), { status: ride_interface_1.RideStatus.COMPLETED, user: { $ne: null } }) },
            { $group: { _id: "$user" } },
            { $count: "count" }
        ]).then(result => { var _a; return ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.count) || 0; }),
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, previousMatch), { status: ride_interface_1.RideStatus.COMPLETED, user: { $ne: null } }) },
            { $group: { _id: "$user" } },
            { $count: "count" }
        ]).then(result => { var _a; return ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.count) || 0; }),
        user_model_1.User.countDocuments({
            role: user_interface_1.Role.RIDER,
            createdAt: { $gte: currentStart, $lte: currentEnd }
        }),
        user_model_1.User.countDocuments({
            role: user_interface_1.Role.RIDER,
            createdAt: { $gte: previousStart, $lte: previousEnd }
        }),
        // Top riders by spending
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, currentMatch), { status: ride_interface_1.RideStatus.COMPLETED, user: { $ne: null } }) },
            {
                $group: {
                    _id: "$user",
                    totalSpent: { $sum: "$finalFare" },
                    trips: { $sum: 1 }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "rider"
                }
            },
            { $unwind: "$rider" }
        ]),
        // Top riders by trips
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, currentMatch), { status: ride_interface_1.RideStatus.COMPLETED, user: { $ne: null } }) },
            {
                $group: {
                    _id: "$user",
                    trips: { $sum: 1 },
                    totalSpent: { $sum: "$finalFare" }
                }
            },
            { $sort: { trips: -1 } },
            { $limit: 10 }
        ]),
        // Rider engagement segments
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, currentMatch), { status: ride_interface_1.RideStatus.COMPLETED, user: { $ne: null } }) },
            {
                $group: {
                    _id: "$user",
                    trips: { $sum: 1 }
                }
            },
            {
                $bucket: {
                    groupBy: "$trips",
                    boundaries: [1, 5, 10, 20, 50, 100],
                    default: "100+",
                    output: {
                        count: { $sum: 1 },
                        riders: { $push: "$_id" }
                    }
                }
            }
        ]),
        // Daily active riders
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, currentMatch), { status: ride_interface_1.RideStatus.COMPLETED, user: { $ne: null } }) },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        user: "$user"
                    }
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    activeRiders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),
    ]);
    const activeTrend = calculateTrend(activeRiders, previousActiveRiders);
    const newRidersTrend = calculateTrend(newRiders, previousNewRiders);
    const engagementLabels = {
        1: "1-4 trips",
        5: "5-9 trips",
        10: "10-19 trips",
        20: "20-49 trips",
        50: "50-99 trips",
        "100+": "100+ trips"
    };
    return {
        summary: {
            total: totalRiders,
            active: {
                count: activeRiders,
                percentage: totalRiders > 0 ? Math.round((activeRiders / totalRiders) * 100) : 0,
                trend: activeTrend.value,
                trendDirection: activeTrend.direction,
                previousPeriod: previousActiveRiders
            },
            new: {
                count: newRiders,
                trend: newRidersTrend.value,
                trendDirection: newRidersTrend.direction,
                previousPeriod: previousNewRiders
            }
        },
        topBySpending: topRidersBySpending.map(r => ({
            riderId: r._id,
            name: r.rider.name,
            phone: r.rider.phone,
            totalSpent: Math.round(r.totalSpent * 100) / 100,
            trips: r.trips,
            avgSpending: Math.round((r.totalSpent / r.trips) * 100) / 100
        })),
        topByTrips: topRidersByTrips.map(r => ({
            riderId: r._id,
            trips: r.trips,
            totalSpent: Math.round(r.totalSpent * 100) / 100
        })),
        engagement: riderEngagement.map(e => ({
            segment: engagementLabels[e._id] || e._id,
            count: e.count,
            percentage: activeRiders > 0 ? Math.round((e.count / activeRiders) * 100) : 0
        })),
        dailyActiveRiders: dailyActiveRiders.map(d => ({
            date: d._id,
            count: d.activeRiders
        }))
    };
});
/* ---------------- USERS ANALYTICS ---------------- */
const getUsersAnalytics = (currentStart, currentEnd, previousStart, previousEnd) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const [totalUsers, usersByRole, newUsers, previousNewUsers, userGrowth, usersByStatus,] = yield Promise.all([
        user_model_1.User.countDocuments(),
        user_model_1.User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]),
        user_model_1.User.countDocuments({
            createdAt: { $gte: currentStart, $lte: currentEnd }
        }),
        user_model_1.User.countDocuments({
            createdAt: { $gte: previousStart, $lte: previousEnd }
        }),
        // Monthly user growth
        user_model_1.User.aggregate([
            {
                $match: {
                    createdAt: { $gte: currentStart, $lte: currentEnd }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),
        // Users by verification status
        user_model_1.User.aggregate([
            { $group: { _id: "$isVerified", count: { $sum: 1 } } }
        ]),
    ]);
    const newUsersTrend = calculateTrend(newUsers, previousNewUsers);
    const roleBreakdown = usersByRole.reduce((acc, r) => {
        acc[r._id] = r.count;
        return acc;
    }, {});
    const verified = ((_a = usersByStatus.find(u => u._id === true)) === null || _a === void 0 ? void 0 : _a.count) || 0;
    const unverified = ((_b = usersByStatus.find(u => u._id === false)) === null || _b === void 0 ? void 0 : _b.count) || 0;
    return {
        summary: {
            total: totalUsers,
            new: {
                count: newUsers,
                trend: newUsersTrend.value,
                trendDirection: newUsersTrend.direction,
                previousPeriod: previousNewUsers
            },
            verified: {
                count: verified,
                percentage: totalUsers > 0 ? Math.round((verified / totalUsers) * 100) : 0
            },
            unverified: {
                count: unverified,
                percentage: totalUsers > 0 ? Math.round((unverified / totalUsers) * 100) : 0
            }
        },
        byRole: {
            admins: roleBreakdown[user_interface_1.Role.ADMIN] || 0,
            drivers: roleBreakdown[user_interface_1.Role.DRIVER] || 0,
            riders: roleBreakdown[user_interface_1.Role.RIDER] || 0
        },
        growth: userGrowth.map(g => ({
            date: g._id,
            count: g.count
        }))
    };
});
/* ---------------- KPI Metrics ---------------- */
const getKpis = (range) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const rideMatch = (0, exports.makeRideMatch)(range);
    const [totalRides, ridersCount, driversCount, ridesByStatus, revenueAgg,] = yield Promise.all([
        ride_model_1.Ride.countDocuments(rideMatch),
        user_model_1.User.countDocuments({ role: user_interface_1.Role.RIDER }),
        user_model_1.User.countDocuments({ role: user_interface_1.Role.DRIVER }),
        ride_model_1.Ride.aggregate([
            { $match: rideMatch },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, rideMatch), { status: ride_interface_1.RideStatus.COMPLETED }) },
            { $group: { _id: null, revenue: { $sum: "$finalFare" } } },
        ]),
    ]);
    const statusMap = ridesByStatus.reduce((acc, r) => {
        acc[r._id] = r.count;
        return acc;
    }, {});
    return {
        totalRides,
        totalRiders: ridersCount,
        totalDrivers: driversCount,
        ridesByStatus: statusMap,
        totalRevenue: (_b = (_a = revenueAgg[0]) === null || _a === void 0 ? void 0 : _a.revenue) !== null && _b !== void 0 ? _b : 0,
    };
});
/* ---------------- Ride Trends ---------------- */
const getRidesTrend = (range_1, ...args_1) => __awaiter(void 0, [range_1, ...args_1], void 0, function* (range, granularity = "day") {
    const rideMatch = (0, exports.makeRideMatch)(range);
    const format = granularity === "day" ? "%Y-%m-%d" : "%Y-%m";
    const trend = yield ride_model_1.Ride.aggregate([
        { $match: rideMatch },
        {
            $group: {
                _id: { $dateToString: { format, date: "$createdAt" } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    return trend.map(t => ({ period: t._id, count: t.count }));
});
/* ---------------- Revenue Trends ---------------- */
const getRevenueTrend = (range_1, ...args_1) => __awaiter(void 0, [range_1, ...args_1], void 0, function* (range, granularity = "day") {
    const rideMatch = (0, exports.makeRideMatch)(range);
    const format = granularity === "day" ? "%Y-%m-%d" : "%Y-%m";
    const trend = yield ride_model_1.Ride.aggregate([
        { $match: Object.assign(Object.assign({}, rideMatch), { status: ride_interface_1.RideStatus.COMPLETED }) },
        {
            $group: {
                _id: { $dateToString: { format, date: "$createdAt" } },
                grossRevenue: { $sum: "$finalFare" },
                netRevenue: { $sum: { $multiply: ["$finalFare", 0.2] } },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    return trend.map(t => ({ period: t._id, grossRevenue: t.grossRevenue, netRevenue: t.netRevenue }));
});
/* ---------------- Top Drivers ---------------- */
function getTopDrivers(range_1) {
    return __awaiter(this, arguments, void 0, function* (range, limit = 10) {
        const rideMatch = (0, exports.makeRideMatch)(range);
        const rows = yield ride_model_1.Ride.aggregate([
            { $match: Object.assign(Object.assign({}, rideMatch), { status: ride_interface_1.RideStatus.COMPLETED, driver: { $ne: null } }) },
            { $group: { _id: "$driver", completedRides: { $sum: 1 }, revenue: { $sum: "$finalFare" } } },
            { $sort: { completedRides: -1, revenue: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: "drivers",
                    localField: "_id",
                    foreignField: "_id",
                    as: "driver",
                },
            },
            { $unwind: "$driver" },
            {
                $project: {
                    _id: 0,
                    driverId: "$driver._id",
                    completedRides: 1,
                    revenue: 1,
                },
            },
        ]);
        return rows;
    });
}
/* ---------------- Top Riders ---------------- */
const getTopRiders = (range_1, ...args_1) => __awaiter(void 0, [range_1, ...args_1], void 0, function* (range, limit = 10) {
    const rideMatch = (0, exports.makeRideMatch)(range);
    const rows = yield ride_model_1.Ride.aggregate([
        {
            $match: Object.assign(Object.assign({}, rideMatch), { status: ride_interface_1.RideStatus.COMPLETED, user: { $ne: null } }),
        },
        {
            $group: {
                _id: "$user",
                trips: { $sum: 1 },
                totalSpent: { $sum: "$finalFare" },
            },
        },
        { $sort: { totalSpent: -1, trips: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "rider",
            },
        },
        { $unwind: "$rider" },
        {
            $project: {
                _id: 0,
                riderId: "$rider._id",
                name: "$rider.name",
                phone: "$rider.phone",
                trips: 1,
                totalSpent: 1,
            },
        },
    ]);
    return rows;
});
exports.getTopRiders = getTopRiders;
/* ---------------- Cancellation Breakdown ---------------- */
const getCancellationBreakdown = (range) => __awaiter(void 0, void 0, void 0, function* () {
    const rideMatch = (0, exports.makeRideMatch)(range);
    const rows = yield ride_model_1.Ride.aggregate([
        {
            $match: Object.assign(Object.assign({}, rideMatch), { status: {
                    $in: [
                        ride_interface_1.RideStatus.CANCELLED_BY_ADMIN,
                        ride_interface_1.RideStatus.CANCELLED_BY_DRIVER,
                        ride_interface_1.RideStatus.CANCELLED_BY_RIDER,
                        ride_interface_1.RideStatus.CANCELLED_FOR_PENDING_TIME_OVER,
                    ],
                } }),
        },
        { $group: { _id: "$canceledReason", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);
    return rows.map(r => { var _a; return ({ reason: (_a = r._id) !== null && _a !== void 0 ? _a : "UNKNOWN", count: r.count }); });
});
exports.getCancellationBreakdown = getCancellationBreakdown;
/* ---------------- System Funnel ---------------- */
const getSystemFunnel = (range) => __awaiter(void 0, void 0, void 0, function* () {
    const rideMatch = (0, exports.makeRideMatch)(range);
    const stages = [
        ride_interface_1.RideStatus.REQUESTED,
        ride_interface_1.RideStatus.ACCEPTED,
        ride_interface_1.RideStatus.GOING_TO_PICK_UP,
        ride_interface_1.RideStatus.DRIVER_ARRIVED,
        ride_interface_1.RideStatus.IN_TRANSIT,
        ride_interface_1.RideStatus.REACHED_DESTINATION,
        ride_interface_1.RideStatus.COMPLETED,
    ];
    const rows = yield ride_model_1.Ride.aggregate([
        { $match: rideMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const map = rows.reduce((a, r) => {
        a[r._id] = r.count;
        return a;
    }, {});
    return stages.map(s => { var _a; return ({ stage: s, count: (_a = map[s]) !== null && _a !== void 0 ? _a : 0 }); });
});
exports.getSystemFunnel = getSystemFunnel;
/* ---------------- Export ---------------- */
exports.Analytics = {
    getKpis,
    getRidesTrend,
    getRevenueTrend,
    getTopDrivers,
    getTopRiders: exports.getTopRiders,
    getCancellationBreakdown: exports.getCancellationBreakdown,
    getSystemFunnel: exports.getSystemFunnel,
    getDashboardSummary,
    getAdvancedAnalytics
};
