"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLocationZodSchema = exports.driverRatingZodSchema = exports.updateDriverZodSchema = exports.locationZodSchema = exports.createDriverZodSchema = void 0;
const zod_1 = __importDefault(require("zod"));
const driver_interface_1 = require("./driver.interface");
exports.createDriverZodSchema = zod_1.default.object({
    licenseNumber: zod_1.default
        .string({ error: "License Number must be a string" })
        .min(5, { message: "License Number must be at least 5 characters long." })
        .max(20, { message: "License Number cannot exceed 20 characters." })
});
exports.locationZodSchema = zod_1.default.object({
    type: zod_1.default.literal("Point").default("Point"),
    coordinates: zod_1.default
        .array(zod_1.default.coerce.number())
        .length(2)
        .refine(([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90, { message: "Coordinates must be [longitude, latitude]" })
});
exports.updateDriverZodSchema = zod_1.default.object({
    licenseNumber: zod_1.default
        .string({ error: "License Number must be a string" })
        .min(5, { message: "License Number must be at least 5 characters long." })
        .max(20, { message: "License Number cannot exceed 20 characters." })
        .optional(),
    status: zod_1.default.enum(Object.values(driver_interface_1.DriverStatus)).optional(),
    approved: zod_1.default.boolean({ error: "Approved must be a boolean" }).optional(),
    location: exports.locationZodSchema.optional(),
    activeRide: zod_1.default.string().regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid active ride ID format." }).optional(),
    earnings: zod_1.default.number({ error: "Earnings must be a number" }).min(0, { message: "Earnings at least 0" }).optional(),
    rating: zod_1.default.number().min(0, { message: "Rating at least 0" }).max(5, { message: "Ratings can not exceed 5" }).optional(),
    isSuspended: zod_1.default.boolean({ error: "isSuspended must be a boolean" }).optional(),
    // vehicles: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid Vehicle ID format." })).optional()
});
exports.driverRatingZodSchema = zod_1.default.object({
    rating: zod_1.default.number({ error: "Rating must be a number" }).min(1, { message: "Rating must be at least 1." }).max(5, { message: "Rating cannot exceed 5." }),
    rideId: zod_1.default.string().regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid Ride ID format." })
});
exports.updateLocationZodSchema = zod_1.default.object({
    location: exports.locationZodSchema
});
