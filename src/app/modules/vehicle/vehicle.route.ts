import { Router } from "express";
import { vehicleController } from "./vehicle.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { validateRequest } from "../../middlewares/validateRequest";
import { createVehicleZodSchema } from "./vehicle.validation";

const router=Router();

router.post("/create",validateRequest(createVehicleZodSchema),checkAuth(Role.RIDER,Role.DRIVER),vehicleController.createVehicle);
router.get("/my-vehicles",checkAuth(Role.DRIVER),vehicleController.getMyVehicles);
router.patch("/active-status-change/:vehicleId",checkAuth(Role.DRIVER),vehicleController.activeVehicleStatusChange);

export const vehicleRoutes = router;