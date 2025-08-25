import z from "zod";
import { DriverStatus } from "./driver.interface";

export const createDriverZodSchema = z.object({
    licenseNumber: z
        .string({ error: "License Number must be a string" })
        .min(5, { message: "License Number must be at least 5 characters long." })
        .max(20, { message: "License Number cannot exceed 20 characters." })
})

export const updateDriverZodSchema = z.object({
    licenseNumber: z
        .string({ error: "License Number must be a string" })
        .min(5, { message: "License Number must be at least 5 characters long." })
        .max(20, { message: "License Number cannot exceed 20 characters." })
        .optional(),
    status: z.enum(Object.values(DriverStatus)).optional(),
    approved: z.boolean({ error: "Approved must be a boolean" }).optional(),
    location: z.object({
        lat: z.number({ error: "Latitude must be a number" }).min(-90, { message: "Latitude must be at least -90" }).max(90, { message: "Latitude can not exceed 90." }),
        lng: z.number({ error: "Longitude must be a number" }).min(-180, { message: "Longitude must be at least -180" }).max(180, { message: "Longitude can not exceed  180." })
    }).optional(),
    activeRide: z.string().regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid active ride ID format." }).optional(),
    earnings: z.number({ error: "Earnings must be a number" }).min(0, { message: "Earnings at least 0" }).optional(),
    rating: z.number().min(0, { message: "Rating at least 0" }).max(5, { message: "Ratings can not exceed 5" }).optional(),
    isSuspended: z.boolean({ error: "isSuspended must be a boolean" }).optional(),
    // vehicles: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid Vehicle ID format." })).optional()
})

export const updateLocationZodSchema = z.object({
    lat: z.number({ error: "Latitude must be a number" }).min(-90, { message: "Latitude must be at least -90" }).max(90, { message: "Latitude cannot exceed 90." }),
    lng: z.number({ error: "Longitude must be a number" }).min(-180, { message: "Longitude must be at least -180" }).max(180, { message: "Longitude cannot exceed 180." })
});


