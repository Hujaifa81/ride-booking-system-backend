import z from "zod";
import { RideStatus } from "./ride.interface";
import { locationZodSchema } from "../driver/driver.validation";

export const createRideZodSchema = z.object({
    pickupLocation: locationZodSchema,
    dropOffLocation: locationZodSchema
})
export const updateRideZodSchema = z.object({
    status: z.enum(Object.values(RideStatus)).optional(),
    fare: z.number({ error: "Fare must be a number" }).min(0, { message: "Fare must be at least 0." }).optional(),
    distance: z.number({ error: "Distance must be a number" }).min(0, { message: "Distance must be at least 0." }).optional(),
    duration: z.number({ error: "Duration must be a number" }).min(0, { message: "Duration must be at least 0." }).optional(),
    canceledReason: z.string({ error: "Canceled reason must be a string" }).max(200, { message: "Canceled reason cannot exceed 200 characters." }).optional(),
    pickupLocation: locationZodSchema.optional(),
    dropOffLocation: locationZodSchema.optional(),
    statusHistory: z.array(z.object({
        status: z.enum(Object.values(RideStatus)),
        timestamp: z.date({ error: "Timestamp must be a valid date" }),
        by: z.string().regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid ObjectId format." })
    })).optional(),
    
});

export const createFeedbackZodSchema = z.object({
    feedback: z.string({ error: "Feedback must be a string" }).max(500, { message: "Feedback cannot exceed 500 characters." }),
    rideId: z.string().regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid Ride ID format." })
});

export const rideStatusChangeZodSchema = z.object({
    status: z.enum(Object.values(RideStatus), { message: "Status must be one of the predefined ride statuses." })
});

export const cancelRideZodSchema = z.object({
    canceledReason: z.string({ error: "Canceled reason must be a string" }).max(200, { message: "Canceled reason cannot exceed 200 characters." }).optional().default("")
});