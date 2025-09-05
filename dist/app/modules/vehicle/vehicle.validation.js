"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVehicleZodSchema = exports.createVehicleZodSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.createVehicleZodSchema = zod_1.default.object({
    make: zod_1.default
        .string({ error: "Make must be a string" })
        .max(50, { message: "Make cannot exceed 50 characters." })
        .optional(),
    model: zod_1.default
        .string({ error: "Model must be a string" })
        .min(1, { message: "Model must be at least 1 character long." })
        .max(50, { message: "Model cannot exceed 50 characters." }),
    licensePlate: zod_1.default
        .string({ error: "License Plate must be a string" })
        .min(1, { message: "License Plate must be at least 1 character long." })
        .max(20, { message: "License Plate cannot exceed 20 characters." }),
    type: zod_1.default
        .string({ error: "Type must be a string" })
        .max(30, { message: "Type cannot exceed 30 characters." })
        .optional(),
    capacity: zod_1.default
        .number({ error: "Capacity must be a number" })
        .min(1, { message: "Capacity must be at least 1." })
        .max(100, { message: "Capacity cannot exceed 100." })
        .optional(),
});
exports.updateVehicleZodSchema = zod_1.default.object({
    make: zod_1.default
        .string({ error: "Make must be a string" })
        .max(50, { message: "Make cannot exceed 50 characters." })
        .optional(),
    model: zod_1.default
        .string({ error: "Model must be a string" })
        .min(1, { message: "Model must be at least 1 character long." })
        .max(50, { message: "Model cannot exceed 50 characters." })
        .optional(),
    licensePlate: zod_1.default
        .string({ error: "License Plate must be a string" })
        .min(1, { message: "License Plate must be at least 1 character long." })
        .max(20, { message: "License Plate cannot exceed 20 characters." })
        .optional(),
    type: zod_1.default
        .string({ error: "Type must be a string" })
        .max(30, { message: "Type cannot exceed 30 characters." })
        .optional(),
    capacity: zod_1.default
        .number({ error: "Capacity must be a number" })
        .min(1, { message: "Capacity must be at least 1." })
        .max(100, { message: "Capacity cannot exceed 100." })
        .optional(),
    isActive: zod_1.default.boolean({ error: "isActive must be a boolean" }).optional(),
    isDeleted: zod_1.default.boolean({ error: "isDeleted must be a boolean" }).optional(),
});
