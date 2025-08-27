import  { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { cancelRideZodSchema, createRideZodSchema, rideStatusChangeZodSchema } from "./ride.validation";
import { Role } from "../user/user.interface";
import { checkAuth } from "../../middlewares/checkAuth";
import { RideController } from "./ride.controller";


const router = Router();

router.post("/create", validateRequest(createRideZodSchema), checkAuth(Role.RIDER), RideController.createRide);
router.patch("/status-change-after-ride-accepted/:rideId",validateRequest(rideStatusChangeZodSchema), checkAuth(Role.DRIVER,Role.ADMIN), RideController.rideStatusChangeAfterRideAccepted);
router.patch("/cancel-ride/:rideId", validateRequest(cancelRideZodSchema),checkAuth(...Object.values(Role)), RideController.cancelRide);
router.get("/all-rides", checkAuth(Role.ADMIN), RideController.getAllRides);
router.get("/:rideId", checkAuth(...Object.values(Role)), RideController.getSingleRideDetails);
router.get("/history/:userId", checkAuth(...Object.values(Role)), RideController.getRideHistory);
router.patch("/reject-ride/:rideId",checkAuth(Role.DRIVER),RideController.rejectRide);
router.patch("/accept-ride/:rideId",checkAuth(Role.DRIVER),RideController.acceptRide);

export const rideRoutes = router;