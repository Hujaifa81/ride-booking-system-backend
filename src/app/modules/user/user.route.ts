import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { createUserZodSchema, updateUserZodSchema } from "./user.validation";
import { userController } from "./user.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "./user.interface";

const router=Router();

router.post('/register',validateRequest(createUserZodSchema),userController.register)
router.get('/get-all',checkAuth(Role.ADMIN),userController.getAllUsers)
//block or activate user
router.patch('/is-active/:userId',validateRequest(updateUserZodSchema),checkAuth(Role.ADMIN),userController.isActiveChange)

export const userRoutes = router;