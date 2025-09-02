import { Router } from "express";
import { ReportController } from "./report.controller";

const router = Router();

router.get("/kpi", ReportController.downloadKpiReport);
router.get("/top-drivers", ReportController.downloadTopDriversReport);
router.get("/top-riders", ReportController.downloadTopRidersReport);
router.get("/full-analytics", ReportController.downloadFullAnalytics);
export const reportRoutes=router;
