import z from "zod";

export const createVehicleZodSchema = z.object({
    make: z
        .string({ error: "Make must be a string" })
        .max(50, { message: "Make cannot exceed 50 characters." })
        .optional(),
    model: z
        .string({ error: "Model must be a string" })
        .min(1, { message: "Model must be at least 1 character long." })
        .max(50, { message: "Model cannot exceed 50 characters." }),
    licensePlate: z
        .string({ error: "License Plate must be a string" })
        .min(1, { message: "License Plate must be at least 1 character long." })
        .max(20, { message: "License Plate cannot exceed 20 characters." }),
    type: z
        .string({ error: "Type must be a string" })
        .max(30, { message: "Type cannot exceed 30 characters." })
        .optional(),
    capacity: z
        .number({ error: "Capacity must be a number" })
        .min(1, { message: "Capacity must be at least 1." })
        .max(100, { message: "Capacity cannot exceed 100." })
        .optional(),
})

export const updateVehicleZodSchema = z.object({
    make: z
        .string({ error: "Make must be a string" })
        .max(50, { message: "Make cannot exceed 50 characters." })
        .optional(),
    model: z
        .string({ error: "Model must be a string" })
        .min(1, { message: "Model must be at least 1 character long." })
        .max(50, { message: "Model cannot exceed 50 characters." })
        .optional(),
    licensePlate: z
        .string({ error: "License Plate must be a string" })
        .min(1, { message: "License Plate must be at least 1 character long." })
        .max(20, { message: "License Plate cannot exceed 20 characters." })
        .optional(),
    type: z
        .string({ error: "Type must be a string" })
        .max(30, { message: "Type cannot exceed 30 characters." })
        .optional(),
    capacity: z
        .number({ error: "Capacity must be a number" })
        .min(1, { message: "Capacity must be at least 1." })
        .max(100, { message: "Capacity cannot exceed 100." })
        .optional(),
    isActive: z.boolean({ error: "isActive must be a boolean" }).optional(),
    isDeleted: z.boolean({ error: "isDeleted must be a boolean" }).optional(),
})