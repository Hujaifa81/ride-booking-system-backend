import { model, Schema } from "mongoose";
import { IVehicle } from "./vehicle.interface";

const vehicleSchema = new Schema<IVehicle>({
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    licensePlate: { type: String, required: true, unique: true },
    make: { type: String },
    model: { type: String, required: true },
    type: { type: String },
    capacity: { type: Number },
    isActive: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }
},{
    timestamps: true,
    versionKey: false
})
export const Vehicle = model<IVehicle>('Vehicle', vehicleSchema);