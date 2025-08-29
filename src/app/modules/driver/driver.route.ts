import { Router } from "express";
import { driverController } from "./driver.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { createDriverZodSchema, driverRatingZodSchema, updateLocationZodSchema } from "./driver.validation";
import { validateRequest } from "../../middlewares/validateRequest";

const router = Router();

router.post("/create",validateRequest(createDriverZodSchema),checkAuth(Role.RIDER,Role.ADMIN),driverController.createDriver);
router.get("/get",checkAuth(Role.ADMIN,Role.RIDER,Role.DRIVER), driverController.getAllDrivers);
router.patch("/approve-status/:driverId",checkAuth(Role.RIDER), driverController.driverApprovedStatusChange);
router.patch("/availability-status/:driverId",checkAuth(Role.DRIVER,Role.ADMIN), driverController.driverStatusChange);
router.patch("/location/:driverId",validateRequest(updateLocationZodSchema),checkAuth(Role.DRIVER), driverController.driverLocationUpdate);
router.get("/earnings-history/:driverId",checkAuth(Role.DRIVER,Role.ADMIN), driverController.getDriverEarningsHistory);
router.patch("/is-suspended/:driverId",checkAuth(Role.ADMIN), driverController.driverSuspendedStatusChange);
router.patch("/rating/:driverId",validateRequest(driverRatingZodSchema),checkAuth(Role.RIDER), driverController.updateDriverRating);



export const driverRoutes = router;