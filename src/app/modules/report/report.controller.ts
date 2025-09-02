/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-extraneous-class */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { ReportService } from "./report.service";
import path from "path";
import fs from "fs";

export class ReportController {

    /**
     * Download KPI report
     */
    static async downloadKpiReport(req: Request, res: Response) {
        const { from, to, driverId, userId, format } = req.query as any;
        const range = { from, to, driverId, userId };
        const data = await ReportService.generateKpiReport(range);

        if (format === "excel") {
            const buffer = await ReportService.jsonToExcel([data]);
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename=kpi_report.xlsx`);
            return res.send(buffer);
        } else if (format === "pdf") {
            const filePath = path.join(__dirname, `kpi_report_${Date.now()}.pdf`);
            await ReportService.generateKpiPdf(range, filePath);
            const fileStream = fs.createReadStream(filePath);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename=kpi_report.pdf`);
            fileStream.pipe(res);
            fileStream.on("end", () => fs.unlink(filePath, () => {}));
            return;
        } else {
            const csv = ReportService.jsonToCsv([data]);
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename=kpi_report.csv`);
            return res.send(csv);
        }
    }

    /**
     * Download Top Drivers report
     */
    static async downloadTopDriversReport(req: Request, res: Response) {
        const { from, to, driverId, userId, limit = "10", format } = req.query as any;
        const range = { from, to, driverId, userId };
        const data = await ReportService.generateTopDriversReport(range, Number(limit));

        if (format === "excel") {
            const buffer = await ReportService.jsonToExcel(data, "Top Drivers");
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename=top_drivers.xlsx`);
            return res.send(buffer);
        } else if (format === "pdf") {
            const filePath = path.join(__dirname, `top_drivers_${Date.now()}.pdf`);
            await ReportService.generateTopDriversPdf(range, filePath, Number(limit));
            const fileStream = fs.createReadStream(filePath);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename=top_drivers.pdf`);
            fileStream.pipe(res);
            fileStream.on("end", () => fs.unlink(filePath, () => {}));
            return;
        } else {
            const csv = ReportService.jsonToCsv(data);
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename=top_drivers.csv`);
            return res.send(csv);
        }
    }

    /**
     * Download Top Riders report
     */
    static async downloadTopRidersReport(req: Request, res: Response) {
        const { from, to, driverId, userId, limit = "10", format } = req.query as any;
        const range = { from, to, driverId, userId };
        const data = await ReportService.generateTopRidersReport(range, Number(limit));

        if (format === "excel") {
            const buffer = await ReportService.jsonToExcel(data, "Top Riders");
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename=top_riders.xlsx`);
            return res.send(buffer);
        } else if (format === "pdf") {
            const filePath = path.join(__dirname, `top_riders_${Date.now()}.pdf`);
            await ReportService.generateTopRidersPdf(range, filePath, Number(limit));
            const fileStream = fs.createReadStream(filePath);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename=top_riders.pdf`);
            fileStream.pipe(res);
            fileStream.on("end", () => fs.unlink(filePath, () => {}));
            return;
        } else {
            const csv = ReportService.jsonToCsv(data);
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename=top_riders.csv`);
            return res.send(csv);
        }
    }

    /**
     * Download Full Analytics report (KPI, Top Drivers, Top Riders)
     */
    static async downloadFullAnalytics(req: Request, res: Response) {
        const { from, to, driverId, userId, limit = "10", format } = req.query as any;
        const range = { from, to, driverId, userId };

        if (format === "pdf") {
            const filePath = path.join(__dirname, `full_analytics_${Date.now()}.pdf`);
            await ReportService.generateFullAnalyticsPdf(range, filePath, Number(limit));
            const fileStream = fs.createReadStream(filePath);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename=full_analytics.pdf`);
            fileStream.pipe(res);
            fileStream.on("end", () => fs.unlink(filePath, () => {}));
            return;
        } else if (format === "excel") {
            const buffer = await ReportService.generateFullAnalyticsExcel(range, Number(limit));
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename=full_analytics.xlsx`);
            return res.send(buffer);
        }
        
    }
}
