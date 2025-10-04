import { Router } from "express";
import { userRoutes } from "../modules/user/user.route";
import { authRoutes } from "../modules/auth/auth.route";
import { driverRoutes } from "../modules/driver/driver.route";
import { vehicleRoutes } from "../modules/vehicle/vehicle.route";
import { rideRoutes } from "../modules/ride/ride.route";
import { analyticsRoutes } from "../modules/analytics/analytics.route";
import { reportRoutes } from "../modules/report/report.route";
import { mapsRoutes } from "../modules/maps/maps.route";



export const router = Router();

const moduleRoutes=[
    {
        path:"/user",
        route:userRoutes
    },
    {
        path:'/auth',
        route:authRoutes
    },
    {
        path: '/driver',
        route:driverRoutes
    },
    {
        path: '/vehicle',
        route:vehicleRoutes
    },
    {
        path: '/ride',
        route:rideRoutes
    },
    {
        path: '/analytics',
        route:analyticsRoutes
    },
    {
        path: '/report',
        route:reportRoutes
    },
    {
        path: '/maps',
        route:mapsRoutes
    }
]
moduleRoutes.forEach((route)=>router.use(route.path, route.route));


