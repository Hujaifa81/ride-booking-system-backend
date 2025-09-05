import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { createUserZodSchema, updateUserZodSchema } from "./user.validation";
import { userController } from "./user.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "./user.interface";

const router=Router();

router.post('/register',validateRequest(createUserZodSchema),userController.register)
router.get('/all',checkAuth(Role.ADMIN),userController.getAllUsers)
router.patch('/:userId',checkAuth(...Object.values(Role)),validateRequest(updateUserZodSchema),userController.updateUser)

export const userRoutes = router;