import  { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { cancelRideZodSchema, createRideZodSchema, rideStatusChangeZodSchema } from "./ride.validation";
import { Role } from "../user/user.interface";
import { checkAuth } from "../../middlewares/checkAuth";
import { RideController } from "./ride.controller";


const router = Router();

router.post("/create", validateRequest(createRideZodSchema), checkAuth(Role.RIDER), RideController.createRide);
router.patch("/status-change/:rideId",validateRequest(rideStatusChangeZodSchema), checkAuth(Role.DRIVER,Role.ADMIN), RideController.rideStatusChange);
router.patch("/cancel-ride/:rideId", validateRequest(cancelRideZodSchema),checkAuth(...Object.values(Role)), RideController.cancelRide);
export const rideRoutes = router;