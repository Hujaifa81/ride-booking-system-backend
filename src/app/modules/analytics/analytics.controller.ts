import { Request, Response } from "express";
import { Analytics } from "./analytics.service";

const getDashboardSummary = async (req: Request, res: Response) => {
    const { from, to, driverId, userId } = req.query as { 
        from?: string; 
        to?: string; 
        driverId?: string;
        userId?: string;
    };
    const data = await Analytics.getKpis({ from, to, driverId, userId });
    res.json(data);
};

const getRideTrends = async (req: Request, res: Response) => {
    const { from, to, granularity, driverId, userId } = req.query as { 
        from?: string; 
        to?: string; 
        granularity?: "day" | "month"; 
        driverId?: string;
        userId?: string;
    };
    const data = await Analytics.getRidesTrend({ from, to, driverId, userId }, granularity ?? "day");
    res.json(data);
};

const getRevenueTrends = async (req: Request, res: Response) => {
    const { from, to, granularity, driverId, userId } = req.query as { 
        from?: string; 
        to?: string; 
        granularity?: "day" | "month"; 
        driverId?: string;
        userId?: string;
    };
    const data = await Analytics.getRevenueTrend({ from, to, driverId, userId }, granularity ?? "day");
    res.json(data);
};

const getTopDriversCtrl = async (req: Request, res: Response) => {
    const { from, to, limit, userId } = req.query as { 
        from?: string; 
        to?: string; 
        limit?: string; 
        userId?: string;
    };
    const data = await Analytics.getTopDrivers({ from, to, userId }, limit ? Number(limit) : 10);
    res.json(data);
};

const getTopRidersCtrl = async (req: Request, res: Response) => {
    const { from, to, limit, driverId } = req.query as { 
        from?: string; 
        to?: string; 
        limit?: string; 
        driverId?: string;
    };
    const data = await Analytics.getTopRiders({ from, to, driverId }, limit ? Number(limit) : 10);
    res.json(data);
};

const getCancellationBreakdownCtrl = async (req: Request, res: Response) => {
    const { from, to, driverId, userId } = req.query as { 
        from?: string; 
        to?: string; 
        driverId?: string;
        userId?: string;
    };
    const data = await Analytics.getCancellationBreakdown({ from, to, driverId, userId });
    res.json(data);
};

const getFunnelCtrl = async (req: Request, res: Response) => {
    const { from, to, driverId, userId } = req.query as { 
        from?: string; 
        to?: string; 
        driverId?: string;
        userId?: string;
    };
    const data = await Analytics.getSystemFunnel({ from, to, driverId, userId });
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
};
