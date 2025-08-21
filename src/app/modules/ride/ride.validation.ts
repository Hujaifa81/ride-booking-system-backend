import z from "zod";
import { RideStatus } from "./ride.interface";

export const createRideZodSchema = z.object({
    pickupLocation: z.object({
        lat: z.number({ error: "Latitude must be a number" }).min(-90, { message: "Latitude must be at least -90" }).max(90, { message: "Latitude cannot exceed 90." }),
        lng: z.number({ error: "Longitude must be a number" }).min(-180, { message: "Longitude must be at least -180" }).max(180, { message: "Longitude cannot exceed 180." })
    }),
    dropOffLocation: z.object({
        lat: z.number({ error: "Latitude must be a number" }).min(-90, { message: "Latitude must be at least -90" }).max(90, { message: "Latitude cannot exceed 90." }),
        lng: z.number({ error: "Longitude must be a number" }).min(-180, { message: "Longitude must be at least -180" }).max(180, { message: "Longitude cannot exceed 180." })
    }),
})
export const updateRideZodSchema = z.object({
    status: z.enum(Object.values(RideStatus)).optional(),
    fare: z.number({ error: "Fare must be a number" }).min(0, { message: "Fare must be at least 0." }).optional(),
    distance: z.number({ error: "Distance must be a number" }).min(0, { message: "Distance must be at least 0." }).optional(),
    duration: z.number({ error: "Duration must be a number" }).min(0, { message: "Duration must be at least 0." }).optional(),
    canceledReason: z.string({ error: "Canceled reason must be a string" }).max(200, { message: "Canceled reason cannot exceed 200 characters." }).optional(),
    pickupLocation: z.object({
        lat: z.number({ error: "Latitude must be a number" }).min(-90, { message: "Latitude must be at least -90" }).max(90, { message: "Latitude cannot exceed 90." }).optional(),
        lng: z.number({ error: "Longitude must be a number" }).min(-180, { message: "Longitude must be at least -180" }).max(180, { message: "Longitude cannot exceed 180." }).optional
    }).optional(),
    dropOffLocation: z.object({
        lat: z.number({ error: "Latitude must be a number" }).min(-90, { message: "Latitude must be at least -90" }).max(90, { message: "Latitude cannot exceed 90." }).optional(),
        lng: z.number({ error: "Longitude must be a number" }).min(-180, { message: "Longitude must be at least -180" }).max(180, { message: "Longitude cannot exceed 180." }).optional(),
    }).optional(),
    statsHistory: z.array(z.object({
        status: z.enum(Object.values(RideStatus)),
        timestamp: z.date({ error: "Timestamp must be a valid date" }),
        by: z.string().regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid ObjectId format." })
    })).optional()
});