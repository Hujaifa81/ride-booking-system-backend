import { Request, Response } from "express";
import { Analytics } from "./analytics.service";

const getDashboardSummary = async (req: Request, res: Response) => {
    const { from, to } = req.query as { from?: string; to?: string };
    const data = await Analytics.getKpis({ from, to });
    res.json(data);
};

const getRideTrends = async (req: Request, res: Response) => {
    const { from, to, granularity } = req.query as { from?: string; to?: string; granularity?: "day" | "month" };
    const data = await Analytics.getRidesTrend({ from, to }, granularity ?? "day");
    res.json(data);
};

const getRevenueTrends = async (req: Request, res: Response) => {
    const { from, to, granularity } = req.query as { from?: string; to?: string; granularity?: "day" | "month" };
    const data = await Analytics.getRevenueTrend({ from, to }, granularity ?? "day");
    res.json(data);
};

const getTopDriversCtrl = async (req: Request, res: Response) => {
    const { from, to, limit } = req.query as { from?: string; to?: string; limit?: string };
    const data = await Analytics.getTopDrivers({ from, to }, limit ? Number(limit) : 10);
    res.json(data);
};

const getTopRidersCtrl = async (req: Request, res: Response) => {
    const { from, to, limit } = req.query as { from?: string; to?: string; limit?: string };
    const data = await Analytics.getTopRiders({ from, to }, limit ? Number(limit) : 10);
    res.json(data);
};

const getCancellationBreakdownCtrl = async (req: Request, res: Response) => {
    const { from, to } = req.query as { from?: string; to?: string };
    const data = await Analytics.getCancellationBreakdown({ from, to });
    res.json(data);
};

const getFunnelCtrl = async (req: Request, res: Response) => {
    const { from, to } = req.query as { from?: string; to?: string };
    const data = await Analytics.getSystemFunnel({ from, to });
    res.json(data);
};

export const analyticsController = {
    getDashboardSummary,
    getRideTrends,
    getRevenueTrends,
    getTopDriversCtrl,
    getTopRidersCtrl,
    getCancellationBreakdownCtrl,
    getFunnelCtrl

}