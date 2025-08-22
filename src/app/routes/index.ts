import { Router } from "express";
import { userRoutes } from "../modules/user/user.route";
import { authRoutes } from "../modules/auth/auth.route";
import { driverRoutes } from "../modules/driver/driver.route";
import { vehicleRoutes } from "../modules/vehicle/vehicle.route";


export const router = Router();

const moduleRoutes=[
    {
        path:"/users",
        route:userRoutes
    },
    {
        path:'/auth',
        route:authRoutes
    },
    {
        path: '/drivers',
        route:driverRoutes
    },
    {
        path: '/vehicles',
        route:vehicleRoutes
    }
]
moduleRoutes.forEach((route)=>router.use(route.path, route.route));


