import { NextFunction, Request, Response, Router } from "express";
import passport from 'passport';
import { authController } from "./auth.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
const router=Router();

router.get("/google", async (req: Request, res: Response, next: NextFunction) => {
    const redirect = req.query.redirect || '/'
    passport.authenticate("google", { scope: ["profile", "email"], state: redirect as string })(req, res, next)
})

router.get("/google/callback",passport.authenticate("google", {
    failureRedirect: "/login",
}),authController.googleCallback)

router.post('/login',authController.credentialsLogin)

router.post('/logout',authController.logout)

router.post('/reset-password',checkAuth(...Object.values(Role)), authController.resetPassword);

router.post('/refresh-token',authController.getNewAccessToken)


export const authRoutes=router