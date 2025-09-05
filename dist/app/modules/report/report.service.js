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
exports.ReportService = void 0;
/* eslint-disable @typescript-eslint/no-extraneous-class */
/* eslint-disable @typescript-eslint/no-explicit-any */
const analytics_service_1 = require("../analytics/analytics.service");
const json2csv_1 = require("json2csv");
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
class ReportService {
    /**
     * Generate KPI report
     */
    static generateKpiReport(range) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield analytics_service_1.Analytics.getKpis(range);
            return data;
        });
    }
    /**
     * Generate Top Drivers report
     */
    static generateTopDriversReport(range_1) {
        return __awaiter(this, arguments, void 0, function* (range, limit = 10) {
            const data = yield analytics_service_1.Analytics.getTopDrivers(range, limit);
            return data;
        });
    }
    /**
     * Generate Top Riders report
     */
    static generateTopRidersReport(range_1) {
        return __awaiter(this, arguments, void 0, function* (range, limit = 10) {
            const data = yield analytics_service_1.Analytics.getTopRiders(range, limit);
            return data;
        });
    }
    /**
     * Convert JSON to CSV
     */
    static jsonToCsv(json, fields) {
        const parser = new json2csv_1.Parser({ fields });
        return parser.parse(json);
    }
    /**
     * Convert JSON to Excel Buffer
     */
    static jsonToExcel(json_1) {
        return __awaiter(this, arguments, void 0, function* (json, sheetName = "Report") {
            const workbook = new exceljs_1.default.Workbook();
            const sheet = workbook.addWorksheet(sheetName);
            if (json.length === 0)
                return workbook.xlsx.writeBuffer();
            // Add columns dynamically
            sheet.columns = Object.keys(json[0]).map(key => ({ header: key, key }));
            // Add rows
            json.forEach(row => sheet.addRow(row));
            return workbook.xlsx.writeBuffer();
        });
    }
    /**
     * Generate Full Analytics Excel with multiple sheets
     */
    static generateFullAnalyticsExcel(range_1) {
        return __awaiter(this, arguments, void 0, function* (range, topLimit = 10) {
            const workbook = new exceljs_1.default.Workbook();
            // KPI Sheet
            const kpiData = yield this.generateKpiReport(range);
            const kpiSheet = workbook.addWorksheet("KPI");
            Object.keys(kpiData).forEach((key, index) => {
                kpiSheet.getCell(index + 1, 1).value = key;
                kpiSheet.getCell(index + 1, 2).value = kpiData[key];
            });
            // Top Drivers Sheet
            const topDrivers = yield this.generateTopDriversReport(range, topLimit);
            const driversSheet = workbook.addWorksheet("Top Drivers");
            if (topDrivers.length > 0) {
                driversSheet.columns = Object.keys(topDrivers[0]).map(key => ({ header: key, key }));
                topDrivers.forEach(row => driversSheet.addRow(row));
            }
            // Top Riders Sheet
            const topRiders = yield this.generateTopRidersReport(range, topLimit);
            const ridersSheet = workbook.addWorksheet("Top Riders");
            if (topRiders.length > 0) {
                ridersSheet.columns = Object.keys(topRiders[0]).map(key => ({ header: key, key }));
                topRiders.forEach(row => ridersSheet.addRow(row));
            }
            return workbook.xlsx.writeBuffer();
        });
    }
    /**
     * Generate PDF report for KPIs
     */
    static generateKpiPdf(range, filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.generateKpiReport(range);
            const doc = new pdfkit_1.default({ margin: 30 });
            const writeStream = fs_1.default.createWriteStream(filePath);
            doc.pipe(writeStream);
            doc.fontSize(18).text("KPI Report", { align: "center" });
            doc.moveDown();
            Object.entries(data).forEach(([key, value]) => {
                doc.fontSize(12).text(`${key}: ${value}`);
            });
            doc.end();
            return new Promise((resolve, reject) => {
                writeStream.on("finish", () => resolve());
                writeStream.on("error", (err) => reject(err));
            });
        });
    }
    /**
     * Generate PDF report for Top Drivers
     */
    static generateTopDriversPdf(range_1, filePath_1) {
        return __awaiter(this, arguments, void 0, function* (range, filePath, limit = 10) {
            const data = yield this.generateTopDriversReport(range, limit);
            const doc = new pdfkit_1.default({ margin: 30 });
            const writeStream = fs_1.default.createWriteStream(filePath);
            doc.pipe(writeStream);
            doc.fontSize(18).text("Top Drivers Report", { align: "center" });
            doc.moveDown();
            data.forEach((driver, index) => {
                doc.fontSize(12).text(`${index + 1}. DriverId: ${driver.driverId}, Completed Rides: ${driver.completedRides}, Revenue: ${driver.revenue}`);
            });
            doc.end();
            return new Promise((resolve, reject) => {
                writeStream.on("finish", () => resolve());
                writeStream.on("error", (err) => reject(err));
            });
        });
    }
    /**
     * Generate PDF report for Top Riders
     */
    static generateTopRidersPdf(range_1, filePath_1) {
        return __awaiter(this, arguments, void 0, function* (range, filePath, limit = 10) {
            const data = yield this.generateTopRidersReport(range, limit);
            const doc = new pdfkit_1.default({ margin: 30 });
            const writeStream = fs_1.default.createWriteStream(filePath);
            doc.pipe(writeStream);
            doc.fontSize(18).text("Top Riders Report", { align: "center" });
            doc.moveDown();
            data.forEach((rider, index) => {
                doc.fontSize(12).text(`${index + 1}. RiderId: ${rider.riderId}, Name: ${rider.name}, Trips: ${rider.trips}, Total Spent: ${rider.totalSpent}`);
            });
            doc.end();
            return new Promise((resolve, reject) => {
                writeStream.on("finish", () => resolve());
                writeStream.on("error", (err) => reject(err));
            });
        });
    }
    /**
     * Generate Full Analytics PDF with multiple sections
     */
    static generateFullAnalyticsPdf(range_1, filePath_1) {
        return __awaiter(this, arguments, void 0, function* (range, filePath, topLimit = 10) {
            const doc = new pdfkit_1.default({ margin: 30 });
            const writeStream = fs_1.default.createWriteStream(filePath);
            doc.pipe(writeStream);
            // ---------------- KPI Section ----------------
            const kpiData = yield this.generateKpiReport(range);
            doc.fontSize(20).text("Full Analytics Report", { align: "center" });
            doc.moveDown();
            doc.fontSize(16).text("KPI Metrics", { underline: true });
            doc.moveDown();
            Object.entries(kpiData).forEach(([key, value]) => {
                doc.fontSize(12).text(`${key}: ${value}`);
            });
            doc.addPage(); // move to a new page for next section
            // ---------------- Top Drivers Section ----------------
            const topDrivers = yield this.generateTopDriversReport(range, topLimit);
            doc.fontSize(16).text("Top Drivers", { underline: true });
            doc.moveDown();
            if (topDrivers.length === 0) {
                doc.fontSize(12).text("No drivers data available.");
            }
            else {
                topDrivers.forEach((driver, index) => {
                    doc.fontSize(12).text(`${index + 1}. DriverId: ${driver.driverId}, Completed Rides: ${driver.completedRides}, Revenue: ${driver.revenue}`);
                });
            }
            doc.addPage(); // move to a new page for next section
            // ---------------- Top Riders Section ----------------
            const topRiders = yield this.generateTopRidersReport(range, topLimit);
            doc.fontSize(16).text("Top Riders", { underline: true });
            doc.moveDown();
            if (topRiders.length === 0) {
                doc.fontSize(12).text("No riders data available.");
            }
            else {
                topRiders.forEach((rider, index) => {
                    doc.fontSize(12).text(`${index + 1}. RiderId: ${rider.riderId}, Name: ${rider.name}, Trips: ${rider.trips}, Total Spent: ${rider.totalSpent}`);
                });
            }
            doc.end();
            return new Promise((resolve, reject) => {
                writeStream.on("finish", () => resolve());
                writeStream.on("error", (err) => reject(err));
            });
        });
    }
}
exports.ReportService = ReportService;
