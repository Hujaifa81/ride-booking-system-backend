import z from "zod";
import { DriverStatus } from "./driver.interface";

export const createDriverZodSchema = z.object({
  licenseNumber: z
    .string({ error: "License Number must be a string" })
    .min(5, { message: "License Number must be at least 5 characters long." })
    .max(20, { message: "License Number cannot exceed 20 characters." })
})

export const locationZodSchema = z.object({
  type: z.literal("Point").default("Point"),
  coordinates: z
  .array(z.coerce.number())
  .length(2)
  .refine(
    ([lng, lat]) =>
      lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90,
    { message: "Coordinates must be [longitude, latitude]" }
  )
});

export const updateDriverZodSchema = z.object({
  licenseNumber: z
    .string({ error: "License Number must be a string" })
    .min(5, { message: "License Number must be at least 5 characters long." })
    .max(20, { message: "License Number cannot exceed 20 characters." })
    .optional(),
  status: z.enum(Object.values(DriverStatus)).optional(),
  approved: z.boolean({ error: "Approved must be a boolean" }).optional(),
  location: locationZodSchema.optional(),
  activeRide: z.string().regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid active ride ID format." }).optional(),
  earnings: z.number({ error: "Earnings must be a number" }).min(0, { message: "Earnings at least 0" }).optional(),
  rating: z.number().min(0, { message: "Rating at least 0" }).max(5, { message: "Ratings can not exceed 5" }).optional(),
  isSuspended: z.boolean({ error: "isSuspended must be a boolean" }).optional(),
  // vehicles: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid Vehicle ID format." })).optional()
})

export const driverRatingZodSchema = z.object({
    rating: z.number({ error: "Rating must be a number" }).min(1, { message: "Rating must be at least 1." }).max(5, { message: "Rating cannot exceed 5." }),
    rideId: z.string().regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid Ride ID format." })
})

export const updateLocationZodSchema = z.object({
    location: locationZodSchema
});


