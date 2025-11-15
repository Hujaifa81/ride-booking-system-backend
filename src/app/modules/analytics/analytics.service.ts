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

const getDashboardSummary = async (filteredDate: IFilterParams) => {
    // Define date ranges for trends
    const now = new Date();
    
    // Handle different date scenarios
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;
    
    if (filteredDate.from && filteredDate.to) {
        // Both dates provided
        currentPeriodStart = new Date(filteredDate.from);
        currentPeriodEnd = new Date(filteredDate.to);
    } else if (filteredDate.from && !filteredDate.to) {
        // Only 'from' provided - use from date to now
        currentPeriodStart = new Date(filteredDate.from);
        currentPeriodEnd = now;
    } else if (!filteredDate.from && filteredDate.to) {
        // Only 'to' provided - use 30 days before 'to' date
        currentPeriodEnd = new Date(filteredDate.to);
        currentPeriodStart = new Date(currentPeriodEnd.getTime() - (30 * 24 * 60 * 60 * 1000));
    } else {
        // No dates provided - use current month
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentPeriodEnd = now;
    }
    
    // Build ride match with calculated dates
    const rideMatch = makeRideMatch({
        from: currentPeriodStart.toISOString(),
        to: currentPeriodEnd.toISOString(),
        driverId: filteredDate.driverId,
        userId: filteredDate.userId,
    });
    
    // Calculate previous period (same duration)
    const periodDuration = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
    const previousPeriodEnd = new Date(currentPeriodStart.getTime() - 1);
    const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodDuration);

    // Previous period match
    const previousMatch: any = {
        createdAt: {
            $gte: previousPeriodStart,
            $lte: previousPeriodEnd
        }
    };

    // Add driver/user filters to previous match if provided
    if (filteredDate.driverId) previousMatch.driver = filteredDate.driverId;
    if (filteredDate.userId) previousMatch.user = filteredDate.userId;

    const [
        // Current period metrics
        totalUsers,
        totalDrivers,
        totalRiders,
        totalAdmins,
        activeDrivers,
        activeRiders,
        completedRides,
        cancelledRides,
        activeRides,
        revenueData,
        
        // New users in current period
        newUsers,
        newDrivers,
        newRiders,
        newAdmins,
        
        // Previous period metrics for trends
        previousCompletedRides,
        previousCancelledRides,
        previousRevenueData,
        previousActiveDrivers,
        previousActiveRiders,
        previousNewUsers,
        previousNewDrivers,
        previousNewRiders,
        previousNewAdmins,
    ] = await Promise.all([
        // Total Users (all roles)
        User.countDocuments(),
        
        // Total Drivers
        User.countDocuments({ role: Role.DRIVER }),
        
        // Total Riders
        User.countDocuments({ role: Role.RIDER }),
        
        // Total Admins
        User.countDocuments({ role: Role.ADMIN }),
        
        // Active Drivers (drivers with at least one completed ride in the period)
        Ride.aggregate([
            { 
                $match: { 
                    ...rideMatch, 
                    status: RideStatus.COMPLETED,
                    driver: { $ne: null }
                } 
            },
            { $group: { _id: "$driver" } },
            { $count: "count" }
        ]).then(result => result[0]?.count || 0),
        
        // Active Riders (riders with at least one completed ride in the period)
        Ride.aggregate([
            { 
                $match: { 
                    ...rideMatch, 
                    status: RideStatus.COMPLETED,
                    user: { $ne: null }
                } 
            },
            { $group: { _id: "$user" } },
            { $count: "count" }
        ]).then(result => result[0]?.count || 0),
        
        // Completed Rides (current period)
        Ride.countDocuments({ 
            ...rideMatch, 
            status: RideStatus.COMPLETED 
        }),
        
        // Cancelled Rides (current period)
        Ride.countDocuments({
            ...rideMatch,
            status: {
                $in: [
                    RideStatus.CANCELLED_BY_ADMIN,
                    RideStatus.CANCELLED_BY_DRIVER,
                    RideStatus.CANCELLED_BY_RIDER,
                    RideStatus.CANCELLED_FOR_PENDING_TIME_OVER,
                ]
            }
        }),
        
        // Active Rides (currently in progress - no date filter)
        Ride.countDocuments({
            status: {
                $in: [
                    RideStatus.REQUESTED,
                    RideStatus.ACCEPTED,
                    RideStatus.GOING_TO_PICK_UP,
                    RideStatus.DRIVER_ARRIVED,
                    RideStatus.IN_TRANSIT,
                    RideStatus.REACHED_DESTINATION,
                ]
            }
        }),
        
        // Total Revenue (current period)
        Ride.aggregate([
            { 
                $match: { 
                    ...rideMatch, 
                    status: RideStatus.COMPLETED 
                } 
            },
            { 
                $group: { 
                    _id: null, 
                    totalRevenue: { $sum: "$finalFare" },
                    platformRevenue: { $sum: { $multiply: ["$finalFare", 0.25] } },
                    driverEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } },
                } 
            }
        ]).then(result => result[0] || { totalRevenue: 0, platformRevenue: 0, driverEarnings: 0 }),
        
        // New Users (current period)
        User.countDocuments({
            createdAt: {
                $gte: currentPeriodStart,
                $lte: currentPeriodEnd
            }
        }),
        
        // New Drivers (current period)
        User.countDocuments({
            role: Role.DRIVER,
            createdAt: {
                $gte: currentPeriodStart,
                $lte: currentPeriodEnd
            }
        }),
        
        // New Riders (current period)
        User.countDocuments({
            role: Role.RIDER,
            createdAt: {
                $gte: currentPeriodStart,
                $lte: currentPeriodEnd
            }
        }),
        
        // New Admins (current period)
        User.countDocuments({
            role: Role.ADMIN,
            createdAt: {
                $gte: currentPeriodStart,
                $lte: currentPeriodEnd
            }
        }),
        
        // Previous Period - Completed Rides
        Ride.countDocuments({ 
            ...previousMatch, 
            status: RideStatus.COMPLETED 
        }),
        
        // Previous Period - Cancelled Rides
        Ride.countDocuments({
            ...previousMatch,
            status: {
                $in: [
                    RideStatus.CANCELLED_BY_ADMIN,
                    RideStatus.CANCELLED_BY_DRIVER,
                    RideStatus.CANCELLED_BY_RIDER,
                    RideStatus.CANCELLED_FOR_PENDING_TIME_OVER,
                ]
            }
        }),
        
        // Previous Period - Revenue
        Ride.aggregate([
            { 
                $match: { 
                    ...previousMatch, 
                    status: RideStatus.COMPLETED 
                } 
            },
            { 
                $group: { 
                    _id: null, 
                    totalRevenue: { $sum: "$finalFare" } 
                } 
            }
        ]).then(result => result[0] || { totalRevenue: 0 }),
        
        // Previous Period - Active Drivers
        Ride.aggregate([
            { 
                $match: { 
                    ...previousMatch, 
                    status: RideStatus.COMPLETED,
                    driver: { $ne: null }
                } 
            },
            { $group: { _id: "$driver" } },
            { $count: "count" }
        ]).then(result => result[0]?.count || 0),
        
        // Previous Period - Active Riders
        Ride.aggregate([
            { 
                $match: { 
                    ...previousMatch, 
                    status: RideStatus.COMPLETED,
                    user: { $ne: null }
                } 
            },
            { $group: { _id: "$user" } },
            { $count: "count" }
        ]).then(result => result[0]?.count || 0),
        
        // Previous Period - New Users
        User.countDocuments({
            createdAt: {
                $gte: previousPeriodStart,
                $lte: previousPeriodEnd
            }
        }),
        
        // Previous Period - New Drivers
        User.countDocuments({
            role: Role.DRIVER,
            createdAt: {
                $gte: previousPeriodStart,
                $lte: previousPeriodEnd
            }
        }),
        
        // Previous Period - New Riders
        User.countDocuments({
            role: Role.RIDER,
            createdAt: {
                $gte: previousPeriodStart,
                $lte: previousPeriodEnd
            }
        }),
        
        // Previous Period - New Admins
        User.countDocuments({
            role: Role.ADMIN,
            createdAt: {
                $gte: previousPeriodStart,
                $lte: previousPeriodEnd
            }
        }),
    ]);

    // Calculate trends (percentage change)
    const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Number((((current - previous) / previous) * 100).toFixed(2));
    };

    const revenueTrend = calculateTrend(revenueData.totalRevenue, previousRevenueData.totalRevenue);
    const completedRidesTrend = calculateTrend(completedRides, previousCompletedRides);
    const cancelledRidesTrend = calculateTrend(cancelledRides, previousCancelledRides);
    const activeDriversTrend = calculateTrend(activeDrivers, previousActiveDrivers);
    const activeRidersTrend = calculateTrend(activeRiders, previousActiveRiders);
    const newUsersTrend = calculateTrend(newUsers, previousNewUsers);
    const newDriversTrend = calculateTrend(newDrivers, previousNewDrivers);
    const newRidersTrend = calculateTrend(newRiders, previousNewRiders);
    const newAdminsTrend = calculateTrend(newAdmins, previousNewAdmins);

    // Calculate duration in days
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
            trend: revenueTrend,
            trendDirection: revenueTrend >= 0 ? "up" : "down",
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
            trend: newUsersTrend,
            trendDirection: newUsersTrend >= 0 ? "up" : "down",
            previousPeriod: previousNewUsers,
        },
        
        drivers: {
            total: totalDrivers,
            active: activeDrivers,
            activePercentage: totalDrivers > 0 
                ? Math.round((activeDrivers / totalDrivers) * 100) 
                : 0,
            new: newDrivers,
            trend: newDriversTrend,
            trendDirection: newDriversTrend >= 0 ? "up" : "down",
            previousPeriod: previousNewDrivers,
            activeTrend: activeDriversTrend,
            activeTrendDirection: activeDriversTrend >= 0 ? "up" : "down",
            previousActivePeriod: previousActiveDrivers,
        },
        
        riders: {
            total: totalRiders,
            active: activeRiders,
            activePercentage: totalRiders > 0 
                ? Math.round((activeRiders / totalRiders) * 100) 
                : 0,
            new: newRiders,
            trend: newRidersTrend,
            trendDirection: newRidersTrend >= 0 ? "up" : "down",
            previousPeriod: previousNewRiders,
            activeTrend: activeRidersTrend,
            activeTrendDirection: activeRidersTrend >= 0 ? "up" : "down",
            previousActivePeriod: previousActiveRiders,
        },
        
        admins: {
            total: totalAdmins,
            new: newAdmins,
            trend: newAdminsTrend,
            trendDirection: newAdminsTrend >= 0 ? "up" : "down",
            previousPeriod: previousNewAdmins,
        },
        
        rides: {
            completed: {
                count: completedRides,
                trend: completedRidesTrend,
                trendDirection: completedRidesTrend >= 0 ? "up" : "down",
                previousPeriod: previousCompletedRides,
            },
            cancelled: {
                count: cancelledRides,
                trend: cancelledRidesTrend,
                trendDirection: cancelledRidesTrend >= 0 ? "up" : "down",
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
};
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
    getDashboardSummary,
};
