import { Router } from "express";
import { vehicleController } from "./vehicle.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { validateRequest } from "../../middlewares/validateRequest";
import { createVehicleZodSchema } from "./vehicle.validation";

const router=Router();

router.post("/create",validateRequest(createVehicleZodSchema),checkAuth(Role.RIDER,Role.DRIVER),vehicleController.createVehicle);
router.patch("/active/:vehicleId",checkAuth(Role.DRIVER),vehicleController.activeVehicle);

export const vehicleRoutes = router;