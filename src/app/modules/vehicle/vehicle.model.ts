import { model, Schema } from "mongoose";
import { IVehicle } from "./vehicle.interface";

const vehicleSchema = new Schema<IVehicle>({
    driverId: { type: Schema.Types.ObjectId, required: true, ref: 'Driver' },
    licensePlate: { type: String, required: true },
    make: { type: String },
    model: { type: String, required: true },
    type: { type: String },
    capacity: { type: Number },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
})
export const Vehicle = model<IVehicle>('Vehicle', vehicleSchema);