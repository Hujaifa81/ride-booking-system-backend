"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const user_route_1 = require("../modules/user/user.route");
const auth_route_1 = require("../modules/auth/auth.route");
const driver_route_1 = require("../modules/driver/driver.route");
const vehicle_route_1 = require("../modules/vehicle/vehicle.route");
const ride_route_1 = require("../modules/ride/ride.route");
const analytics_route_1 = require("../modules/analytics/analytics.route");
const report_route_1 = require("../modules/report/report.route");
exports.router = (0, express_1.Router)();
const moduleRoutes = [
    {
        path: "/user",
        route: user_route_1.userRoutes
    },
    {
        path: '/auth',
        route: auth_route_1.authRoutes
    },
    {
        path: '/driver',
        route: driver_route_1.driverRoutes
    },
    {
        path: '/vehicle',
        route: vehicle_route_1.vehicleRoutes
    },
    {
        path: '/ride',
        route: ride_route_1.rideRoutes
    },
    {
        path: '/analytics',
        route: analytics_route_1.analyticsRoutes
    },
    {
        path: '/report',
        route: report_route_1.reportRoutes
    }
];
moduleRoutes.forEach((route) => exports.router.use(route.path, route.route));
