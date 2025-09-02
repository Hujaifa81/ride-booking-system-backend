import { RideStatus } from "../ride/ride.interface";
import { Ride } from "../ride/ride.model";
import { Role } from "../user/user.interface";
import { User } from "../user/user.model";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IFilterParams {
    from?: string;  // ISO date string
    to?: string;    // ISO date string
    driverId?: string;
    userId?: string;
}

/**
 * Build a MongoDB $match query based on filters.
 */
export const makeRideMatch = ({ from, to, driverId, userId }: IFilterParams) => {
    const match: any = {};

    if (from || to) {
        match.createdAt = {};
        if (from) match.createdAt.$gte = new Date(from);
        if (to) match.createdAt.$lte = new Date(to);
    }

    if (driverId) match.driver = driverId;
    if (userId) match.user = userId;

    return match;
};

/* ---------------- KPI Metrics ---------------- */
const getKpis = async (range: IFilterParams) => {
    const rideMatch = makeRideMatch(range);

    const [
        totalRides,
        ridersCount,
        driversCount,
        ridesByStatus,
        revenueAgg,
    ] = await Promise.all([
        Ride.countDocuments(rideMatch),
        User.countDocuments({ role: Role.RIDER }),
        User.countDocuments({ role: Role.DRIVER }),
        Ride.aggregate([
            { $match: rideMatch },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Ride.aggregate([
            { $match: { ...rideMatch, status: RideStatus.COMPLETED } },
            { $group: { _id: null, revenue: { $sum: "$finalFare" } } },
        ]),
    ]);

    const statusMap = ridesByStatus.reduce<Record<string, number>>((acc, r) => {
        acc[r._id] = r.count;
        return acc;
    }, {});

    return {
        totalRides,
        totalRiders: ridersCount,
        totalDrivers: driversCount,
        ridesByStatus: statusMap,
        totalRevenue: revenueAgg[0]?.revenue ?? 0,
    };
};

/* ---------------- Ride Trends ---------------- */
const getRidesTrend = async (range: IFilterParams, granularity: "day" | "month" = "day") => {
    const rideMatch = makeRideMatch(range);
    const format = granularity === "day" ? "%Y-%m-%d" : "%Y-%m";

    const trend = await Ride.aggregate([
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
};

/* ---------------- Revenue Trends ---------------- */
const getRevenueTrend = async (range: IFilterParams, granularity: "day" | "month" = "day") => {
    const rideMatch = makeRideMatch(range);
    const format = granularity === "day" ? "%Y-%m-%d" : "%Y-%m";

    const trend = await Ride.aggregate([
        { $match: { ...rideMatch, status: RideStatus.COMPLETED } },
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
};

/* ---------------- Top Drivers ---------------- */
export async function getTopDrivers(range: IFilterParams, limit = 10) {
    const rideMatch = makeRideMatch(range);

    const rows = await Ride.aggregate([
        { $match: { ...rideMatch, status: RideStatus.COMPLETED, driver: { $ne: null } } },
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
}

/* ---------------- Top Riders ---------------- */
export const getTopRiders = async (range: IFilterParams, limit = 10) => {
    const rideMatch = makeRideMatch(range);

    const rows = await Ride.aggregate([
        {
            $match: {
                ...rideMatch,
                status: RideStatus.COMPLETED,
                user: { $ne: null },
            },
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
};

/* ---------------- Cancellation Breakdown ---------------- */
export const getCancellationBreakdown = async (range: IFilterParams) => {
    const rideMatch = makeRideMatch(range);

    const rows = await Ride.aggregate([
        {
            $match: {
                ...rideMatch,
                status: {
                    $in: [
                        RideStatus.CANCELLED_BY_ADMIN,
                        RideStatus.CANCELLED_BY_DRIVER,
                        RideStatus.CANCELLED_BY_RIDER,
                        RideStatus.CANCELLED_FOR_PENDING_TIME_OVER,
                    ],
                },
            },
        },
        { $group: { _id: "$canceledReason", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);

    return rows.map(r => ({ reason: r._id ?? "UNKNOWN", count: r.count }));
};

/* ---------------- System Funnel ---------------- */
export const getSystemFunnel = async (range: IFilterParams) => {
    const rideMatch = makeRideMatch(range);

    const stages = [
        RideStatus.REQUESTED,
        RideStatus.ACCEPTED,
        RideStatus.GOING_TO_PICK_UP,
        RideStatus.DRIVER_ARRIVED,
        RideStatus.IN_TRANSIT,
        RideStatus.REACHED_DESTINATION,
        RideStatus.COMPLETED,
    ];

    const rows = await Ride.aggregate([
        { $match: rideMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const map = rows.reduce<Record<string, number>>((a, r) => {
        a[r._id] = r.count;
        return a;
    }, {});

    return stages.map(s => ({ stage: s, count: map[s] ?? 0 }));
};

/* ---------------- Export ---------------- */
export const Analytics = {
    getKpis,
    getRidesTrend,
    getRevenueTrend,
    getTopDrivers,
    getTopRiders,
    getCancellationBreakdown,
    getSystemFunnel,
};
