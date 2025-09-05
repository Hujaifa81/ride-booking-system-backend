"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelRideZodSchema = exports.rideStatusChangeZodSchema = exports.createFeedbackZodSchema = exports.updateRideZodSchema = exports.createRideZodSchema = void 0;
const zod_1 = __importDefault(require("zod"));
const ride_interface_1 = require("./ride.interface");
const driver_validation_1 = require("../driver/driver.validation");
exports.createRideZodSchema = zod_1.default.object({
    pickupLocation: driver_validation_1.locationZodSchema,
    dropOffLocation: driver_validation_1.locationZodSchema
});
exports.updateRideZodSchema = zod_1.default.object({
    status: zod_1.default.enum(Object.values(ride_interface_1.RideStatus)).optional(),
    fare: zod_1.default.number({ error: "Fare must be a number" }).min(0, { message: "Fare must be at least 0." }).optional(),
    distance: zod_1.default.number({ error: "Distance must be a number" }).min(0, { message: "Distance must be at least 0." }).optional(),
    duration: zod_1.default.number({ error: "Duration must be a number" }).min(0, { message: "Duration must be at least 0." }).optional(),
    canceledReason: zod_1.default.string({ error: "Canceled reason must be a string" }).max(200, { message: "Canceled reason cannot exceed 200 characters." }).optional(),
    pickupLocation: driver_validation_1.locationZodSchema.optional(),
    dropOffLocation: driver_validation_1.locationZodSchema.optional(),
    statusHistory: zod_1.default.array(zod_1.default.object({
        status: zod_1.default.enum(Object.values(ride_interface_1.RideStatus)),
        timestamp: zod_1.default.date({ error: "Timestamp must be a valid date" }),
        by: zod_1.default.string().regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid ObjectId format." })
    })).optional(),
});
exports.createFeedbackZodSchema = zod_1.default.object({
    feedback: zod_1.default.string({ error: "Feedback must be a string" }).max(500, { message: "Feedback cannot exceed 500 characters." }),
    rideId: zod_1.default.string().regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid Ride ID format." })
});
exports.rideStatusChangeZodSchema = zod_1.default.object({
    status: zod_1.default.enum(Object.values(ride_interface_1.RideStatus), { message: "Status must be one of the predefined ride statuses." })
});
exports.cancelRideZodSchema = zod_1.default.object({
    canceledReason: zod_1.default.string({ error: "Canceled reason must be a string" }).max(200, { message: "Canceled reason cannot exceed 200 characters." }).optional().default("")
});
