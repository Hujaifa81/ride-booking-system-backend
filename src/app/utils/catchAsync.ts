import { NextFunction, Request, Response } from "express";

type asyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const catchAsync=(fn:asyncHandler)=>(req: Request, res: Response, next: NextFunction)=>{
    Promise.resolve(fn(req, res, next)).catch((error: Error) => {
        next(error);
    })
}