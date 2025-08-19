import mongoose from "mongoose";
import { TErrorSources, TGenericErrorResponse } from "../interfaces/error.types";

export const handleValidationError=(err:mongoose.Error.ValidationError):TGenericErrorResponse=>{
    const ErrorSources:TErrorSources[]=[]
    const errors=Object.values(err.errors);
    errors.forEach((error) => {
        ErrorSources.push({
            path:error.path,
            message:error.message
        })})
        const message = ErrorSources.map((error) => error.path).join(",");
        return {
        statusCode: 400,
        message: `Validation Error in ${message}`,
        errorSources: ErrorSources
        }
}