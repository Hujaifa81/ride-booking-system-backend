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

/**
 * Calculate trend percentage and direction
 */
const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { 
        value: current > 0 ? 100 : 0,
        direction: current > 0 ? "up" : "neutral" as "up" | "down" | "neutral"
    };
    const value = Number((((current - previous) / previous) * 100).toFixed(2));
    return {
        value: Math.abs(value),
        direction: value > 0 ? "up" : value < 0 ? "down" : "neutral" as "up" | "down" | "neutral"
    };
};

/**
 * Calculate previous period dates
 */
const getPreviousPeriod = (start: Date, end: Date) => {
    const duration = end.getTime() - start.getTime();
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - duration);
    return { previousStart, previousEnd };
};

/* ---------------- DASHBOARD SUMMARY ---------------- */
const getDashboardSummary = async (filteredDate: IFilterParams) => {
    const now = new Date();
    
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;
    
    if (filteredDate.from && filteredDate.to) {
        currentPeriodStart = new Date(filteredDate.from);
        currentPeriodEnd = new Date(filteredDate.to);
    } else if (filteredDate.from && !filteredDate.to) {
        currentPeriodStart = new Date(filteredDate.from);
        currentPeriodEnd = now;
    } else if (!filteredDate.from && filteredDate.to) {
        currentPeriodEnd = new Date(filteredDate.to);
        currentPeriodStart = new Date(currentPeriodEnd.getTime() - (30 * 24 * 60 * 60 * 1000));
    } else {
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentPeriodEnd = now;
    }
    
    const rideMatch = makeRideMatch({
        from: currentPeriodStart.toISOString(),
        to: currentPeriodEnd.toISOString(),
        driverId: filteredDate.driverId,
        userId: filteredDate.userId,
    });
    
    const periodDuration = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
    const { previousStart: previousPeriodStart, previousEnd: previousPeriodEnd } = getPreviousPeriod(currentPeriodStart, currentPeriodEnd);

    const previousMatch: any = {
        createdAt: {
            $gte: previousPeriodStart,
            $lte: previousPeriodEnd
        }
    };

    if (filteredDate.driverId) previousMatch.driver = filteredDate.driverId;
    if (filteredDate.userId) previousMatch.user = filteredDate.userId;

    const [
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
        newUsers,
        newDrivers,
        newRiders,
        newAdmins,
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
        User.countDocuments(),
        User.countDocuments({ role: Role.DRIVER }),
        User.countDocuments({ role: Role.RIDER }),
        User.countDocuments({ role: Role.ADMIN }),
        Ride.aggregate([
            { $match: { ...rideMatch, status: RideStatus.COMPLETED, driver: { $ne: null } } },
            { $group: { _id: "$driver" } },
            { $count: "count" }
        ]).then(result => result[0]?.count || 0),
        Ride.aggregate([
            { $match: { ...rideMatch, status: RideStatus.COMPLETED, user: { $ne: null } } },
            { $group: { _id: "$user" } },
            { $count: "count" }
        ]).then(result => result[0]?.count || 0),
        Ride.countDocuments({ ...rideMatch, status: RideStatus.COMPLETED }),
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
        Ride.aggregate([
            { $match: { ...rideMatch, status: RideStatus.COMPLETED } },
            { 
                $group: { 
                    _id: null, 
                    totalRevenue: { $sum: "$finalFare" },
                    platformRevenue: { $sum: { $multiply: ["$finalFare", 0.25] } },
                    driverEarnings: { $sum: { $multiply: ["$finalFare", 0.75] } },
                } 
            }
        ]).then(result => result[0] || { totalRevenue: 0, platformRevenue: 0, driverEarnings: 0 }),
        User.countDocuments({
            createdAt: { $gte: currentPeriodStart, $lte: currentPeriodEnd }
        }),
        User.countDocuments({
            role: Role.DRIVER,
            createdAt: { $gte: currentPeriodStart, $lte: currentPeriodEnd }
        }),
        User.countDocuments({
            role: Role.RIDER,
            createdAt: { $gte: currentPeriodStart, $lte: currentPeriodEnd }
        }),
        User.countDocuments({
            role: Role.ADMIN,
            createdAt: { $gte: currentPeriodStart, $lte: currentPeriodEnd }
        }),
        Ride.countDocuments({ ...previousMatch, status: RideStatus.COMPLETED }),
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
        Ride.aggregate([
            { $match: { ...previousMatch, status: RideStatus.COMPLETED } },
            { $group: { _id: null, totalRevenue: { $sum: "$finalFare" } } }
        ]).then(result => result[0] || { totalRevenue: 0 }),
        Ride.aggregate([
            { $match: { ...previousMatch, status: RideStatus.COMPLETED, driver: { $ne: null } } },
            { $group: { _id: "$driver" } },
            { $count: "count" }
        ]).then(result => result[0]?.count || 0),
        Ride.aggregate([
            { $match: { ...previousMatch, status: RideStatus.COMPLETED, user: { $ne: null } } },
            { $group: { _id: "$user" } },
            { $count: "count" }
        ]).then(result => result[0]?.count || 0),
        User.countDocuments({
            createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd }
        }),
        User.countDocuments({
            role: Role.DRIVER,
            createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd }
        }),
        User.countDocuments({
            role: Role.RIDER,
            createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd }
        }),
        User.countDocuments({
            role: Role.ADMIN,
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
};

/* ---------------- ADVANCED ANALYTICS BY METRIC ---------------- */
const getAdvancedAnalytics = async (
    from?: string, 
    to?: string, 
    metric: "rides" | "revenue" | "drivers" | "riders" | "users" = "rides"
) => {
    const now = new Date();
    
    // Handle different date scenarios
    let currentStart: Date;
    let currentEnd: Date;
    
    if (from && to) {
        // Both dates provided
        currentStart = new Date(from);
        currentEnd = new Date(to);
    } else if (from && !to) {
        // Only 'from' provided - use from date to now
        currentStart = new Date(from);
        currentEnd = now;
    } else if (!from && to) {
        // Only 'to' provided - use 30 days before 'to' date
        currentEnd = new Date(to);
        currentStart = new Date(currentEnd.getTime() - (30 * 24 * 60 * 60 * 1000));
    } else {
        // No dates provided - use current month
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = now;
    }
    
    // Build range for filters
    const range: IFilterParams = {
        from: currentStart.toISOString(),
        to: currentEnd.toISOString()
    };
    
    // Calculate previous period
    const { previousStart, previousEnd } = getPreviousPeriod(currentStart, currentEnd);

    // Build matches
    const rideMatch = makeRideMatch(range);
    const previousRideMatch = makeRideMatch({
        from: previousStart.toISOString(),
        to: previousEnd.toISOString()
    });

    // Route to appropriate analytics function
    switch (metric) {
        case "rides":
            return await getRidesAnalytics(rideMatch, previousRideMatch);
        
        case "revenue":
            return await getRevenueAnalytics(rideMatch, previousRideMatch);
        
        case "drivers":
            return await getDriversAnalytics(
                rideMatch, 
                previousRideMatch, 
                range, 
                currentStart, 
                currentEnd, 
                previousStart, 
                previousEnd
            );
        
        case "riders":
            return await getRidersAnalytics(
                rideMatch, 
                previousRideMatch, 
                range, 
                currentStart, 
                currentEnd, 
                previousStart, 
                previousEnd
            );
        
        case "users":
            return await getUsersAnalytics(
                currentStart, 
                currentEnd, 
                previousStart, 
                previousEnd
            );
        
        default:
            throw new Error("Invalid metric type");
    }
};

/* ---------------- RIDES ANALYTICS ---------------- */
const getRidesAnalytics = async (currentMatch: any, previousMatch: any) => {
    const [
        // Current period
        totalRides,
        completedRides,
        cancelledRides,
        ongoingRides,
        ridesByStatus,
        
        // Hourly distribution
        hourlyDistribution,
        
        // Daily trends (last 30 days)
        dailyTrends,
        
        // Monthly trends (last 12 months)
        monthlyTrends,
        
        // Previous period
        previousTotalRides,
        previousCompletedRides,
        previousCancelledRides,
        
        // Cancellation reasons
        cancellationReasons,
        
        // Average ride metrics
        avgMetrics,
    ] = await Promise.all([
        // Current totals
        Ride.countDocuments(currentMatch),
        Ride.countDocuments({ ...currentMatch, status: RideStatus.COMPLETED }),
        Ride.countDocuments({
            ...currentMatch,
            status: {
                $in: [
                    RideStatus.CANCELLED_BY_ADMIN,
                    RideStatus.CANCELLED_BY_DRIVER,
                    RideStatus.CANCELLED_BY_RIDER,
                    RideStatus.CANCELLED_FOR_PENDING_TIME_OVER,
                ]
            }
        }),
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
        
        // Rides by status
        Ride.aggregate([
            { $match: currentMatch },
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        
        // Hourly distribution
        Ride.aggregate([
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
        Ride.aggregate([
            { $match: currentMatch },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalRides: { $sum: 1 },
                    completedRides: {
                        $sum: { $cond: [{ $eq: ["$status", RideStatus.COMPLETED] }, 1, 0] }
                    },
                    cancelledRides: {
                        $sum: {
                            $cond: [
                                {
                                    $in: [
                                        "$status",
                                        [
                                            RideStatus.CANCELLED_BY_ADMIN,
                                            RideStatus.CANCELLED_BY_DRIVER,
                                            RideStatus.CANCELLED_BY_RIDER,
                                            RideStatus.CANCELLED_FOR_PENDING_TIME_OVER,
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
        Ride.aggregate([
            { $match: currentMatch },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    totalRides: { $sum: 1 },
                    completedRides: {
                        $sum: { $cond: [{ $eq: ["$status", RideStatus.COMPLETED] }, 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]),
        
        // Previous period totals
        Ride.countDocuments(previousMatch),
        Ride.countDocuments({ ...previousMatch, status: RideStatus.COMPLETED }),
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
        
        // Cancellation reasons
        Ride.aggregate([
            {
                $match: {
                    ...currentMatch,
                    status: {
                        $in: [
                            RideStatus.CANCELLED_BY_ADMIN,
                            RideStatus.CANCELLED_BY_DRIVER,
                            RideStatus.CANCELLED_BY_RIDER,
                            RideStatus.CANCELLED_FOR_PENDING_TIME_OVER,
                        ]
                    }
                }
            },
            { $group: { _id: "$canceledReason", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        
        // Average metrics
        Ride.aggregate([
            { $match: { ...currentMatch, status: RideStatus.COMPLETED } },
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
            fare: avgMetrics[0]?.avgFare ? Math.round(avgMetrics[0].avgFare * 100) / 100 : 0,
            distance: avgMetrics[0]?.avgDistance ? Math.round(avgMetrics[0].avgDistance * 100) / 100 : 0,
            duration: avgMetrics[0]?.avgDuration ? Math.round(avgMetrics[0].avgDuration) : 0
        }
    };
};

/* ---------------- REVENUE ANALYTICS ---------------- */
const getRevenueAnalytics = async (currentMatch: any, previousMatch: any) => {
    const [
        currentRevenue,
        previousRevenue,
        dailyRevenue,
        monthlyRevenue,
        revenueByVehicleType,
        topRevenueDrivers,
    ] = await Promise.all([
        // Current period revenue
        Ride.aggregate([
            { $match: { ...currentMatch, status: RideStatus.COMPLETED } },
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
        Ride.aggregate([
            { $match: { ...previousMatch, status: RideStatus.COMPLETED } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$finalFare" }
                }
            }
        ]),
        
        // Daily revenue trends
        Ride.aggregate([
            { $match: { ...currentMatch, status: RideStatus.COMPLETED } },
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
        Ride.aggregate([
            { $match: { ...currentMatch, status: RideStatus.COMPLETED } },
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
        Ride.aggregate([
            { $match: { ...currentMatch, status: RideStatus.COMPLETED } },
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
        Ride.aggregate([
            { $match: { ...currentMatch, status: RideStatus.COMPLETED, driver: { $ne: null } } },
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
};

/* ---------------- DRIVERS ANALYTICS ---------------- */
const getDriversAnalytics = async (
    currentMatch: any, 
    previousMatch: any, 
    range: IFilterParams,
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
) => {
    const [
        totalDrivers,
        activeDrivers,
        previousActiveDrivers,
        newDrivers,
        previousNewDrivers,
        driverPerformance,
        driversByStatus,
        topDriversByRides,
        topDriversByRevenue,
        dailyActiveDrivers,
    ] = await Promise.all([
        User.countDocuments({ role: Role.DRIVER }),
        
        Ride.aggregate([
            { $match: { ...currentMatch, status: RideStatus.COMPLETED, driver: { $ne: null } } },
            { $group: { _id: "$driver" } },
            { $count: "count" }
        ]).then(result => result[0]?.count || 0),
        
        Ride.aggregate([
            { $match: { ...previousMatch, status: RideStatus.COMPLETED, driver: { $ne: null } } },
            { $group: { _id: "$driver" } },
            { $count: "count" }
        ]).then(result => result[0]?.count || 0),
        
        User.countDocuments({
            role: Role.DRIVER,
            createdAt: { $gte: currentStart, $lte: currentEnd }
        }),
        
        User.countDocuments({
            role: Role.DRIVER,
            createdAt: { $gte: previousStart, $lte: previousEnd }
        }),
        
        // Driver performance metrics
        Ride.aggregate([
            { $match: { ...currentMatch, driver: { $ne: null } } },
            {
                $group: {
                    _id: "$driver",
                    totalRides: { $sum: 1 },
                    completedRides: {
                        $sum: { $cond: [{ $eq: ["$status", RideStatus.COMPLETED] }, 1, 0] }
                    },
                    cancelledRides: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", RideStatus.CANCELLED_BY_DRIVER] },
                                1,
                                0
                            ]
                        }
                    },
                    totalRevenue: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", RideStatus.COMPLETED] },
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
        User.aggregate([
            { $match: { role: Role.DRIVER } },
            { $group: { _id: "$isApproved", count: { $sum: 1 } } }
        ]),
        
        // Top drivers by rides
        Ride.aggregate([
            { $match: { ...currentMatch, status: RideStatus.COMPLETED, driver: { $ne: null } } },
            { $group: { _id: "$driver", rides: { $sum: 1 } } },
            { $sort: { rides: -1 } },
            { $limit: 10 }
        ]),
        
        // Top drivers by revenue
        Ride.aggregate([
            { $match: { ...currentMatch, status: RideStatus.COMPLETED, driver: { $ne: null } } },
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
        Ride.aggregate([
            { $match: { ...currentMatch, status: RideStatus.COMPLETED, driver: { $ne: null } } },
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

    const approved = driversByStatus.find(d => d._id === true)?.count || 0;
    const pending = driversByStatus.find(d => d._id === false)?.count || 0;

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
};

/* ---------------- RIDERS ANALYTICS ---------------- */
const getRidersAnalytics = async (
    currentMatch: any,
    previousMatch: any,
    range: IFilterParams,
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
) => {
    const [
        totalRiders,
        activeRiders,
        previousActiveRiders,
        newRiders,
        previousNewRiders,
        topRidersBySpending,
        topRidersByTrips,
        riderEngagement,
        dailyActiveRiders,
    ] = await Promise.all([
        User.countDocuments({ role: Role.RIDER }),
        
        Ride.aggregate([
            { $match: { ...currentMatch, status: RideStatus.COMPLETED, user: { $ne: null } } },
            { $group: { _id: "$user" } },
            { $count: "count" }
        ]).then(result => result[0]?.count || 0),
        
        Ride.aggregate([
            { $match: { ...previousMatch, status: RideStatus.COMPLETED, user: { $ne: null } } },
            { $group: { _id: "$user" } },
            { $count: "count" }
        ]).then(result => result[0]?.count || 0),
        
        User.countDocuments({
            role: Role.RIDER,
            createdAt: { $gte: currentStart, $lte: currentEnd }
        }),
        
        User.countDocuments({
            role: Role.RIDER,
            createdAt: { $gte: previousStart, $lte: previousEnd }
        }),
        
        // Top riders by spending
        Ride.aggregate([
            { $match: { ...currentMatch, status: RideStatus.COMPLETED, user: { $ne: null } } },
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
        Ride.aggregate([
            { $match: { ...currentMatch, status: RideStatus.COMPLETED, user: { $ne: null } } },
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
        Ride.aggregate([
            { $match: { ...currentMatch, status: RideStatus.COMPLETED, user: { $ne: null } } },
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
        Ride.aggregate([
            { $match: { ...currentMatch, status: RideStatus.COMPLETED, user: { $ne: null } } },
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
            segment: engagementLabels[e._id as keyof typeof engagementLabels] || e._id,
            count: e.count,
            percentage: activeRiders > 0 ? Math.round((e.count / activeRiders) * 100) : 0
        })),
        
        dailyActiveRiders: dailyActiveRiders.map(d => ({
            date: d._id,
            count: d.activeRiders
        }))
    };
};

/* ---------------- USERS ANALYTICS ---------------- */
const getUsersAnalytics = async (
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
) => {
    const [
        totalUsers,
        usersByRole,
        newUsers,
        previousNewUsers,
        userGrowth,
        usersByStatus,
    ] = await Promise.all([
        User.countDocuments(),
        
        User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]),
        
        User.countDocuments({
            createdAt: { $gte: currentStart, $lte: currentEnd }
        }),
        
        User.countDocuments({
            createdAt: { $gte: previousStart, $lte: previousEnd }
        }),
        
        // Monthly user growth
        User.aggregate([
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
        User.aggregate([
            { $group: { _id: "$isVerified", count: { $sum: 1 } } }
        ]),
    ]);

    const newUsersTrend = calculateTrend(newUsers, previousNewUsers);

    const roleBreakdown = usersByRole.reduce((acc, r) => {
        acc[r._id] = r.count;
        return acc;
    }, {} as Record<string, number>);

    const verified = usersByStatus.find(u => u._id === true)?.count || 0;
    const unverified = usersByStatus.find(u => u._id === false)?.count || 0;

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
            admins: roleBreakdown[Role.ADMIN] || 0,
            drivers: roleBreakdown[Role.DRIVER] || 0,
            riders: roleBreakdown[Role.RIDER] || 0
        },
        
        growth: userGrowth.map(g => ({
            date: g._id,
            count: g.count
        }))
    };
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
    getAdvancedAnalytics
};