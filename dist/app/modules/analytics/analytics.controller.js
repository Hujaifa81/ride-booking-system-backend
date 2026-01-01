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
exports.analyticsController = void 0;
const analytics_service_1 = require("./analytics.service");
const sendResponse_1 = require("../../utils/sendResponse");
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const getDashboardSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const filteredDate = req.query;
    const summary = yield analytics_service_1.Analytics.getDashboardSummary(filteredDate);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: "Dashboard summary fetched successfully",
        success: true,
        data: summary
    });
});
const getAdminAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, to, metric } = req.query;
    const data = yield analytics_service_1.Analytics.getAdvancedAnalytics(from, to, metric !== null && metric !== void 0 ? metric : "rides");
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_codes_1.default.OK,
        message: "Admin analytics fetched successfully",
        success: true,
        data: data
    });
});
const getRideTrends = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, to, granularity, driverId, userId } = req.query;
    const data = yield analytics_service_1.Analytics.getRidesTrend({ from, to, driverId, userId }, granularity !== null && granularity !== void 0 ? granularity : "day");
    res.json(data);
});
const getRevenueTrends = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, to, granularity, driverId, userId } = req.query;
    const data = yield analytics_service_1.Analytics.getRevenueTrend({ from, to, driverId, userId }, granularity !== null && granularity !== void 0 ? granularity : "day");
    res.json(data);
});
const getTopDriversCtrl = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, to, limit, userId } = req.query;
    const data = yield analytics_service_1.Analytics.getTopDrivers({ from, to, userId }, limit ? Number(limit) : 10);
    res.json(data);
});
const getTopRidersCtrl = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, to, limit, driverId } = req.query;
    const data = yield analytics_service_1.Analytics.getTopRiders({ from, to, driverId }, limit ? Number(limit) : 10);
    res.json(data);
});
const getCancellationBreakdownCtrl = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, to, driverId, userId } = req.query;
    const data = yield analytics_service_1.Analytics.getCancellationBreakdown({ from, to, driverId, userId });
    res.json(data);
});
const getFunnelCtrl = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, to, driverId, userId } = req.query;
    const data = yield analytics_service_1.Analytics.getSystemFunnel({ from, to, driverId, userId });
    res.json(data);
});
exports.analyticsController = {
    getDashboardSummary,
    getRideTrends,
    getRevenueTrends,
    getTopDriversCtrl,
    getTopRidersCtrl,
    getCancellationBreakdownCtrl,
    getFunnelCtrl,
    getAdminAnalytics
};
