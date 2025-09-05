"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleValidationError = void 0;
const handleValidationError = (err) => {
    const ErrorSources = [];
    const errors = Object.values(err.errors);
    errors.forEach((error) => {
        ErrorSources.push({
            path: error.path,
            message: error.message
        });
    });
    const message = ErrorSources.map((error) => error.path).join(",");
    return {
        statusCode: 400,
        message: `Validation Error in ${message}`,
        errorSources: ErrorSources
    };
};
exports.handleValidationError = handleValidationError;
