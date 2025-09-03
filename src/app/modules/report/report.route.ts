import { Router } from "express";
import { ReportController } from "./report.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";

const router = Router();

router.get("/kpi",checkAuth(Role.ADMIN),ReportController.downloadKpiReport);
router.get("/top-drivers",checkAuth(Role.ADMIN), ReportController.downloadTopDriversReport);
router.get("/top-riders",checkAuth(Role.ADMIN), ReportController.downloadTopRidersReport);
router.get("/full-analytics",checkAuth(Role.ADMIN), ReportController.downloadFullAnalytics);
export const reportRoutes=router;
