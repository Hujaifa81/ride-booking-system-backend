import { Router } from "express";
import { driverController } from "./driver.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { createDriverZodSchema, updateLocationZodSchema } from "./driver.validation";
import { validateRequest } from "../../middlewares/validateRequest";

const router = Router();

router.post("/create",validateRequest(createDriverZodSchema),checkAuth(Role.RIDER,Role.ADMIN),driverController.createDriver);
router.get("/get-all",checkAuth(Role.ADMIN,Role.RIDER,Role.DRIVER), driverController.getAllDrivers);
router.patch("/approve-status-change/:driverId",checkAuth(Role.RIDER), driverController.driverApprovedStatusChange);
router.patch("/availability-status-change/:driverId",checkAuth(Role.DRIVER,Role.ADMIN), driverController.driverStatusChange);
router.patch("/location-update/:driverId",validateRequest(updateLocationZodSchema),checkAuth(Role.DRIVER), driverController.driverLocationUpdate);
router.get("/earnings-history/:driverId",checkAuth(Role.DRIVER,Role.ADMIN), driverController.getDriverEarningsHistory);
router.patch("/is-suspended/:driverId",checkAuth(Role.ADMIN), driverController.driverSuspendedStatusChange);


export const driverRoutes = router;