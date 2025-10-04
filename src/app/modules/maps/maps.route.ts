import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { mapsController } from "./maps.controller";

const router= Router();

router.get("/get-coordinates",
    // checkAuth(Role.RIDER),
    mapsController.getCoordinates);
router.get("/get-suggestions",
    // checkAuth(Role.RIDER),
    mapsController.getSuggestions);

export const mapsRoutes=router;