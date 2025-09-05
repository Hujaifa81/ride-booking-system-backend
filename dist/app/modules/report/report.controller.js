"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const report_service_1 = require("./report.service");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class ReportController {
    /**
     * Download KPI report
     */
    static downloadKpiReport(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { from, to, driverId, userId, format } = req.query;
            const range = { from, to, driverId, userId };
            const data = yield report_service_1.ReportService.generateKpiReport(range);
            if (format === "excel") {
                const buffer = yield report_service_1.ReportService.jsonToExcel([data]);
                res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                res.setHeader("Content-Disposition", `attachment; filename=kpi_report.xlsx`);
                return res.send(buffer);
            }
            else if (format === "pdf") {
                const filePath = path_1.default.join(__dirname, `kpi_report_${Date.now()}.pdf`);
                yield report_service_1.ReportService.generateKpiPdf(range, filePath);
                const fileStream = fs_1.default.createReadStream(filePath);
                res.setHeader("Content-Type", "application/pdf");
                res.setHeader("Content-Disposition", `attachment; filename=kpi_report.pdf`);
                fileStream.pipe(res);
                fileStream.on("end", () => fs_1.default.unlink(filePath, () => { }));
                return;
            }
            else {
                const csv = report_service_1.ReportService.jsonToCsv([data]);
                res.setHeader("Content-Type", "text/csv");
                res.setHeader("Content-Disposition", `attachment; filename=kpi_report.csv`);
                return res.send(csv);
            }
        });
    }
    /**
     * Download Top Drivers report
     */
    static downloadTopDriversReport(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { from, to, driverId, userId, limit = "10", format } = req.query;
            const range = { from, to, driverId, userId };
            const data = yield report_service_1.ReportService.generateTopDriversReport(range, Number(limit));
            if (format === "excel") {
                const buffer = yield report_service_1.ReportService.jsonToExcel(data, "Top Drivers");
                res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                res.setHeader("Content-Disposition", `attachment; filename=top_drivers.xlsx`);
                return res.send(buffer);
            }
            else if (format === "pdf") {
                const filePath = path_1.default.join(__dirname, `top_drivers_${Date.now()}.pdf`);
                yield report_service_1.ReportService.generateTopDriversPdf(range, filePath, Number(limit));
                const fileStream = fs_1.default.createReadStream(filePath);
                res.setHeader("Content-Type", "application/pdf");
                res.setHeader("Content-Disposition", `attachment; filename=top_drivers.pdf`);
                fileStream.pipe(res);
                fileStream.on("end", () => fs_1.default.unlink(filePath, () => { }));
                return;
            }
            else {
                const csv = report_service_1.ReportService.jsonToCsv(data);
                res.setHeader("Content-Type", "text/csv");
                res.setHeader("Content-Disposition", `attachment; filename=top_drivers.csv`);
                return res.send(csv);
            }
        });
    }
    /**
     * Download Top Riders report
     */
    static downloadTopRidersReport(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { from, to, driverId, userId, limit = "10", format } = req.query;
            const range = { from, to, driverId, userId };
            const data = yield report_service_1.ReportService.generateTopRidersReport(range, Number(limit));
            if (format === "excel") {
                const buffer = yield report_service_1.ReportService.jsonToExcel(data, "Top Riders");
                res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                res.setHeader("Content-Disposition", `attachment; filename=top_riders.xlsx`);
                return res.send(buffer);
            }
            else if (format === "pdf") {
                const filePath = path_1.default.join(__dirname, `top_riders_${Date.now()}.pdf`);
                yield report_service_1.ReportService.generateTopRidersPdf(range, filePath, Number(limit));
                const fileStream = fs_1.default.createReadStream(filePath);
                res.setHeader("Content-Type", "application/pdf");
                res.setHeader("Content-Disposition", `attachment; filename=top_riders.pdf`);
                fileStream.pipe(res);
                fileStream.on("end", () => fs_1.default.unlink(filePath, () => { }));
                return;
            }
            else {
                const csv = report_service_1.ReportService.jsonToCsv(data);
                res.setHeader("Content-Type", "text/csv");
                res.setHeader("Content-Disposition", `attachment; filename=top_riders.csv`);
                return res.send(csv);
            }
        });
    }
    /**
     * Download Full Analytics report (KPI, Top Drivers, Top Riders)
     */
    static downloadFullAnalytics(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { from, to, driverId, userId, limit = "10", format } = req.query;
            const range = { from, to, driverId, userId };
            if (format === "pdf") {
                const filePath = path_1.default.join(__dirname, `full_analytics_${Date.now()}.pdf`);
                yield report_service_1.ReportService.generateFullAnalyticsPdf(range, filePath, Number(limit));
                const fileStream = fs_1.default.createReadStream(filePath);
                res.setHeader("Content-Type", "application/pdf");
                res.setHeader("Content-Disposition", `attachment; filename=full_analytics.pdf`);
                fileStream.pipe(res);
                fileStream.on("end", () => fs_1.default.unlink(filePath, () => { }));
                return;
            }
            else if (format === "excel") {
                const buffer = yield report_service_1.ReportService.generateFullAnalyticsExcel(range, Number(limit));
                res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                res.setHeader("Content-Disposition", `attachment; filename=full_analytics.xlsx`);
                return res.send(buffer);
            }
        });
    }
}
exports.ReportController = ReportController;
