import { Router } from "express";
import { driverController } from "./driver.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { createDriverZodSchema } from "./driver.validation";
import { validateRequest } from "../../middlewares/validateRequest";

const router = Router();

router.post("/create",validateRequest(createDriverZodSchema),checkAuth(Role.RIDER,Role.ADMIN),driverController.createDriver);
router.get("/get-all",checkAuth(Role.ADMIN,Role.RIDER,Role.DRIVER), driverController.getAllDrivers);
router.patch("/approve-status-change/:driverId",checkAuth(Role.ADMIN), driverController.driverApprovedStatusChange);
router.patch("/status-change/:driverId",checkAuth(Role.DRIVER,Role.ADMIN), driverController.driverStatusChange);


export const driverRoutes = router;