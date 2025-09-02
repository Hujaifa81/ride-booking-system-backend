import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { createUserZodSchema, updateUserZodSchema } from "./user.validation";
import { userController } from "./user.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "./user.interface";

const router=Router();

router.post('/register',validateRequest(createUserZodSchema),userController.register)
router.get('/all',checkAuth(Role.ADMIN),userController.getAllUsers)
//block or activate user
router.patch('/is-active/:userId',validateRequest(updateUserZodSchema),checkAuth(Role.ADMIN),userController.isActiveChange)
router.patch('/role/:userId',validateRequest(updateUserZodSchema),checkAuth(Role.ADMIN),userController.updateUserRole)

export const userRoutes = router;