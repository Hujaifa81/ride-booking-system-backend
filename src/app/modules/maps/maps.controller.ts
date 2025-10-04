/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { mapsService } from "./maps.service";

const getCoordinates=catchAsync(async(req:Request,res:Response,next:NextFunction)=>{
    const {address}=req.query;
    const coordinates=await mapsService.getCoordinates(address as string);
    res.status(200).json({
        success:true,
        message:"Coordinates fetched successfully",
        data:coordinates
    })
})

const getSuggestions=catchAsync(async(req:Request,res:Response,next:NextFunction)=>{
    // This is a placeholder function. Implement your logic to fetch suggestions based on user input.
    const {input}=req.query;
    const suggestions=await mapsService.getSuggestions(input as string);
    res.status(200).json({
        success:true,
        message:"Suggestions fetched successfully",
        data:suggestions
    })
})
export const mapsController={
    getCoordinates,
    getSuggestions
}