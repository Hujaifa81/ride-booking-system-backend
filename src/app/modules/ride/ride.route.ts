import  { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { createRideZodSchema } from "./ride.validation";
import { Role } from "../user/user.interface";
import { checkAuth } from "../../middlewares/checkAuth";
import { RideController } from "./ride.controller";

const router = Router();

router.post("/create", validateRequest(createRideZodSchema), checkAuth(Role.RIDER), RideController.createRide);
router.patch("/status-change/:rideId", checkAuth(...Object.values(Role)), RideController.rideStatusChange);

export const rideRoutes = router;