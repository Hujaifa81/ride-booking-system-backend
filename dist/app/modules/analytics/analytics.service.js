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
                    // name: "$driver.name",
                    // phone: "$driver.phone",
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
};
