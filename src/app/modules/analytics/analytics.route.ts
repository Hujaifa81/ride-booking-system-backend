import { Router } from "express";
import { analyticsController } from "./analytics.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";

const router=Router();

router.get('/dashboard-summary',checkAuth(Role.ADMIN),analyticsController.getDashboardSummary);
router.get('/ride-trends',checkAuth(Role.ADMIN),analyticsController.getRideTrends);
router.get('/revenue-trends',checkAuth(Role.ADMIN),analyticsController.getRevenueTrends);
router.get('/top-drivers',checkAuth(Role.ADMIN),analyticsController.getTopDriversCtrl);
router.get('/top-riders',checkAuth(Role.ADMIN),analyticsController.getTopRidersCtrl);
router.get('/cancellation-breakdown',checkAuth(Role.ADMIN),analyticsController.getCancellationBreakdownCtrl);
router.get('/funnel',checkAuth(Role.ADMIN),analyticsController.getFunnelCtrl);


export const analyticsRoutes=router
