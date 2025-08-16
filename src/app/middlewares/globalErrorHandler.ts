/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import { envVars } from "../config/env";
import { handleCastError } from "../helpers/handleCastError";
import AppError from "../errorHelpers/AppError";

export const globalErrorHandler = async(err:any, req:Request, res:Response, next:NextFunction) => {
    if(envVars.NODE_ENV === "development"){
        console.log(err);
    }
    let statusCode = 500;
    let message = "Internal Server Error";

    if(err.name==='ValidationError'){
        const simplifiedErrors=handleCastError(err);
        statusCode = simplifiedErrors.statusCode;
        message = simplifiedErrors.message;
    }
    else if(err instanceof AppError){
        statusCode = err.statusCode;
        message = err.message;
    }
    else if(err instanceof Error){
        statusCode=500;
        message = err.message;
    }
    res.status(statusCode).json({
        success: false,
        message: message,
        err: envVars.NODE_ENV === "development" ? err : null,
        stack: envVars.NODE_ENV === "development" ? err.stack : null
    })
}
