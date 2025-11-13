import { Router } from "express";
import { driverController } from "./driver.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { createDriverZodSchema, driverRatingZodSchema, updateLocationZodSchema } from "./driver.validation";
import { validateRequest } from "../../middlewares/validateRequest";

const router = Router();

router.post("/create",validateRequest(createDriverZodSchema),checkAuth(Role.RIDER),driverController.createDriver);
router.get("/all",checkAuth(Role.ADMIN,Role.RIDER,Role.DRIVER), driverController.getAllDrivers);
router.patch("/approve-status/:driverId",checkAuth(Role.ADMIN), driverController.driverApprovedStatusChange);
router.patch("/availability-status",checkAuth(Role.DRIVER), driverController.driverStatusChange);
router.patch("/location",validateRequest(updateLocationZodSchema),checkAuth(Role.DRIVER), driverController.driverLocationUpdate);
router.get("/earnings-history/:driverId",checkAuth(Role.DRIVER,Role.ADMIN), driverController.getDriverEarningsHistory);
router.patch("/is-suspended/:driverId",checkAuth(Role.ADMIN), driverController.driverSuspendedStatusChange);
router.patch("/rating/:driverId",validateRequest(driverRatingZodSchema),checkAuth(Role.RIDER), driverController.updateDriverRating);
router.get("/my-driver-profile",checkAuth(Role.DRIVER,Role.RIDER), driverController.getMyDriverProfile);
router.get("/dashboard-metrics",checkAuth(Role.DRIVER), driverController.getDriverDashboardMetrics);
router.get("/earnings-analytics",checkAuth(Role.DRIVER), driverController.getDriverEarningsAnalytics);
router.get("/peak-earning-hours",checkAuth(Role.DRIVER), driverController.getDriverPeakEarningHours);
router.get("/top-earning-routes",checkAuth(Role.DRIVER), driverController.getDriverTopEarningRoutes);


export const driverRoutes = router;