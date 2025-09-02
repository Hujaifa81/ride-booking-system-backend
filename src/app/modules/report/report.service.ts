/* eslint-disable @typescript-eslint/no-extraneous-class */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Analytics, IFilterParams, } from "../analytics/analytics.service";
import { Parser as Json2CsvParser } from "json2csv";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";

export class ReportService {
    /**
     * Generate KPI report
     */
    static async generateKpiReport(range: IFilterParams) {
        const data = await Analytics.getKpis(range);
        return data;
    }

    /**
     * Generate Top Drivers report
     */
    static async generateTopDriversReport(range: IFilterParams, limit = 10) {
        const data = await Analytics.getTopDrivers(range, limit);
        return data;
    }

    /**
     * Generate Top Riders report
     */
    static async generateTopRidersReport(range: IFilterParams, limit = 10) {
        const data = await Analytics.getTopRiders(range, limit);
        return data;
    }

    /**
     * Convert JSON to CSV
     */
    static jsonToCsv(json: any[], fields?: string[]) {
        const parser = new Json2CsvParser({ fields });
        return parser.parse(json);
    }

    /**
     * Convert JSON to Excel Buffer
     */
    static async jsonToExcel(json: any[], sheetName = "Report") {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(sheetName);

        if (json.length === 0) return workbook.xlsx.writeBuffer();

        // Add columns dynamically
        sheet.columns = Object.keys(json[0]).map(key => ({ header: key, key }));

        // Add rows
        json.forEach(row => sheet.addRow(row));

        return workbook.xlsx.writeBuffer();
    }
    /**
     * Generate Full Analytics Excel with multiple sheets
     */

    static async generateFullAnalyticsExcel(range: IFilterParams, topLimit = 10) {
        const workbook = new ExcelJS.Workbook();

        // KPI Sheet
        const kpiData = await this.generateKpiReport(range);
        const kpiSheet = workbook.addWorksheet("KPI");
        Object.keys(kpiData).forEach((key, index) => {
            kpiSheet.getCell(index + 1, 1).value = key;
            kpiSheet.getCell(index + 1, 2).value = kpiData[key as keyof typeof kpiData];
        });

        // Top Drivers Sheet
        const topDrivers = await this.generateTopDriversReport(range, topLimit);
        const driversSheet = workbook.addWorksheet("Top Drivers");
        if (topDrivers.length > 0) {
            driversSheet.columns = Object.keys(topDrivers[0]).map(key => ({ header: key, key }));
            topDrivers.forEach(row => driversSheet.addRow(row));
        }

        // Top Riders Sheet
        const topRiders = await this.generateTopRidersReport(range, topLimit);
        const ridersSheet = workbook.addWorksheet("Top Riders");
        if (topRiders.length > 0) {
            ridersSheet.columns = Object.keys(topRiders[0]).map(key => ({ header: key, key }));
            topRiders.forEach(row => ridersSheet.addRow(row));
        }

        return workbook.xlsx.writeBuffer();
    }

    /**
     * Generate PDF report for KPIs
     */
    static async generateKpiPdf(range: IFilterParams, filePath: string) {
        const data = await this.generateKpiReport(range);
        const doc = new PDFDocument({ margin: 30 });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        doc.fontSize(18).text("KPI Report", { align: "center" });
        doc.moveDown();

        Object.entries(data).forEach(([key, value]) => {
            doc.fontSize(12).text(`${key}: ${value}`);
        });

        doc.end();

        return new Promise<void>((resolve, reject) => {
            writeStream.on("finish", () => resolve());
            writeStream.on("error", (err) => reject(err));
        });
    }

    /**
     * Generate PDF report for Top Drivers
     */
    static async generateTopDriversPdf(range: IFilterParams, filePath: string, limit = 10) {
        const data = await this.generateTopDriversReport(range, limit);
        const doc = new PDFDocument({ margin: 30 });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        doc.fontSize(18).text("Top Drivers Report", { align: "center" });
        doc.moveDown();

        data.forEach((driver, index) => {
            doc.fontSize(12).text(
                `${index + 1}. DriverId: ${driver.driverId}, Completed Rides: ${driver.completedRides}, Revenue: ${driver.revenue}`
            );
        });

        doc.end();

        return new Promise<void>((resolve, reject) => {
            writeStream.on("finish", () => resolve());
            writeStream.on("error", (err) => reject(err));
        });
    }

    /**
     * Generate PDF report for Top Riders
     */
    static async generateTopRidersPdf(range: IFilterParams, filePath: string, limit = 10) {
        const data = await this.generateTopRidersReport(range, limit);
        const doc = new PDFDocument({ margin: 30 });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        doc.fontSize(18).text("Top Riders Report", { align: "center" });
        doc.moveDown();

        data.forEach((rider, index) => {
            doc.fontSize(12).text(
                `${index + 1}. RiderId: ${rider.riderId}, Name: ${rider.name}, Trips: ${rider.trips}, Total Spent: ${rider.totalSpent}`
            );
        });

        doc.end();

        return new Promise<void>((resolve, reject) => {
            writeStream.on("finish", () => resolve());
            writeStream.on("error", (err) => reject(err));
        });
    }

    /**
     * Generate Full Analytics PDF with multiple sections
     */
    static async generateFullAnalyticsPdf(range: IFilterParams, filePath: string, topLimit = 10) {
        const doc = new PDFDocument({ margin: 30 });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // ---------------- KPI Section ----------------
        const kpiData = await this.generateKpiReport(range);
        doc.fontSize(20).text("Full Analytics Report", { align: "center" });
        doc.moveDown();
        doc.fontSize(16).text("KPI Metrics", { underline: true });
        doc.moveDown();

        Object.entries(kpiData).forEach(([key, value]) => {
            doc.fontSize(12).text(`${key}: ${value}`);
        });

        doc.addPage(); // move to a new page for next section

        // ---------------- Top Drivers Section ----------------
        const topDrivers = await this.generateTopDriversReport(range, topLimit);
        doc.fontSize(16).text("Top Drivers", { underline: true });
        doc.moveDown();

        if (topDrivers.length === 0) {
            doc.fontSize(12).text("No drivers data available.");
        } else {
            topDrivers.forEach((driver, index) => {
                doc.fontSize(12).text(
                    `${index + 1}. DriverId: ${driver.driverId}, Completed Rides: ${driver.completedRides}, Revenue: ${driver.revenue}`
                );
            });
        }

        doc.addPage(); // move to a new page for next section

        // ---------------- Top Riders Section ----------------
        const topRiders = await this.generateTopRidersReport(range, topLimit);
        doc.fontSize(16).text("Top Riders", { underline: true });
        doc.moveDown();

        if (topRiders.length === 0) {
            doc.fontSize(12).text("No riders data available.");
        } else {
            topRiders.forEach((rider, index) => {
                doc.fontSize(12).text(
                    `${index + 1}. RiderId: ${rider.riderId}, Name: ${rider.name}, Trips: ${rider.trips}, Total Spent: ${rider.totalSpent}`
                );
            });
        }

        doc.end();

        return new Promise<void>((resolve, reject) => {
            writeStream.on("finish", () => resolve());
            writeStream.on("error", (err) => reject(err));
        });
    }

}
