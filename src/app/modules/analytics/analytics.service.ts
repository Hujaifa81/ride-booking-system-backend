import { RideStatus } from "../ride/ride.interface";
import { Ride } from "../ride/ride.model";
import { Role } from "../user/user.interface";
import { User } from "../user/user.model";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface DateRange {
    from?: string; // ISO date string
    to?: string;   // ISO date string
}

export const makeDateMatch = ({ from, to }: DateRange) => {
    const match: any = {};
    if (from || to) {
        match.createdAt = {};
        if (from) match.createdAt.$gte = new Date(from);
        if (to) match.createdAt.$lte = new Date(to);
    }
    return match;
}

const getKpis = async (range: DateRange) => {
    const createdMatch = makeDateMatch(range);

    const [
        totalRides,
        ridersCount,
        driversCount,
        ridesByStatus,
        revenueAgg,
    ] = await Promise.all([
        Ride.countDocuments(createdMatch),
        User.countDocuments({ role: Role.RIDER }),
        User.countDocuments({ role: Role.DRIVER }),
        Ride.aggregate([
            { $match: createdMatch },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Ride.aggregate([
            { $match: { ...createdMatch, status: "COMPLETED" } },
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
}

const getRidesTrend = async (range: DateRange, granularity: "day" | "month" = "day") => {
    const createdMatch = makeDateMatch(range);
    const format = granularity === "day" ? "%Y-%m-%d" : "%Y-%m";

    const trend = await Ride.aggregate([
        { $match: createdMatch },
        {
            $group: {
                _id: { $dateToString: { format, date: "$createdAt" } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    return trend.map(t => ({ period: t._id, count: t.count }));
}
const getRevenueTrend = async (range: DateRange, granularity: "day" | "month" = "day") => {
    const createdMatch = makeDateMatch(range);
    const format = granularity === "day" ? "%Y-%m-%d" : "%Y-%m";

    const trend = await Ride.aggregate([
        { $match: { ...createdMatch, status: RideStatus.COMPLETED } },
        {
            $group: {
                _id: { $dateToString: { format, date: "$createdAt" } },
                revenue: { $sum: "$finalFare" },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    return trend.map(t => ({ period: t._id, revenue: t.revenue }));
}

export async function getTopDrivers(range: DateRange, limit = 10) {
    const createdMatch = makeDateMatch(range);

    const rows = await Ride.aggregate([
        { $match: { ...createdMatch, status: RideStatus.COMPLETED, driver: { $ne: null } } },
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

export const getTopRiders = async (range: DateRange, limit = 10) => {
  const createdMatch = makeDateMatch(range);

  const rows = await Ride.aggregate([
    { 
      $match: { 
        ...createdMatch, 
        status: RideStatus.COMPLETED, 
        user: { $ne: null } 
      } 
    },
    { 
      $group: { 
        _id: "$user", 
        trips: { $sum: 1 }, 
        totalSpent: { $sum: "$finalFare" } 
      } 
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


export const getCancellationBreakdown=async(range: DateRange)=>{
    const createdMatch = makeDateMatch(range);

    const rows = await Ride.aggregate([
        { $match: { ...createdMatch, status: { $in: [RideStatus.CANCELLED_BY_ADMIN, RideStatus.CANCELLED_BY_DRIVER, RideStatus.CANCELLED_BY_RIDER, RideStatus.CANCELLED_FOR_PENDING_TIME_OVER] } } },
        { $group: { _id: "$canceledReason", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);

    return rows.map(r => ({ reason: r._id ?? "UNKNOWN", count: r.count }));
}

export const getSystemFunnel=async(range: DateRange)=>{
    const createdMatch = makeDateMatch(range);

    const stages = [RideStatus.REQUESTED, RideStatus.ACCEPTED, RideStatus.GOING_TO_PICK_UP, RideStatus.DRIVER_ARRIVED, RideStatus.IN_TRANSIT, RideStatus.REACHED_DESTINATION, RideStatus.COMPLETED]

    const rows = await Ride.aggregate([
        { $match: createdMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const map = rows.reduce<Record<string, number>>((a, r) => {
        a[r._id] = r.count;
        return a;
    }, {});

    return stages.map(s => ({ stage: s, count: map[s] ?? 0 }));
}

export const Analytics = {
    getKpis,
    getRidesTrend,
    getRevenueTrend,
    getTopDrivers,
    getTopRiders,
    getCancellationBreakdown,
    getSystemFunnel
};