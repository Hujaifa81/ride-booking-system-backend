import  { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { cancelRideZodSchema, createFeedbackZodSchema, createRideZodSchema, rideStatusChangeZodSchema } from "./ride.validation";
import { Role } from "../user/user.interface";
import { checkAuth } from "../../middlewares/checkAuth";
import { RideController } from "./ride.controller";


const router = Router();

router.post("/create", validateRequest(createRideZodSchema), checkAuth(Role.RIDER), RideController.createRide);
router.patch("/status-change/:rideId",validateRequest(rideStatusChangeZodSchema), checkAuth(Role.DRIVER,Role.ADMIN), RideController.rideStatusChangeAfterRideAccepted);
router.patch("/cancel/:rideId", validateRequest(cancelRideZodSchema),checkAuth(...Object.values(Role)), RideController.cancelRide);
router.get("/all", checkAuth(Role.ADMIN), RideController.getAllRides);
router.get("/:rideId", checkAuth(...Object.values(Role)), RideController.getSingleRideDetails);
router.get("/history/:userId", checkAuth(...Object.values(Role)), RideController.getRideHistory);
router.patch("/reject/:rideId",checkAuth(Role.DRIVER),RideController.rejectRide);
router.patch("/accept/:rideId",checkAuth(Role.DRIVER),RideController.acceptRide);
router.post("/feedback",validateRequest(createFeedbackZodSchema),checkAuth(Role.RIDER),RideController.createFeedback);

export const rideRoutes = router;