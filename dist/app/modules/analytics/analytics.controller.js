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
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsController = void 0;
const analytics_service_1 = require("./analytics.service");
const getDashboardSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, to, driverId, userId } = req.query;
    const data = yield analytics_service_1.Analytics.getKpis({ from, to, driverId, userId });
    res.json(data);
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
    getFunnelCtrl
};
