import { model, Schema } from "mongoose";
import { DriverStatus, IDriver, ILocation } from "./driver.interface";

export const locationSchema = new Schema<ILocation>({
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
}, {
    _id: false,
    versionKey: false
});

const driverSchema=new Schema<IDriver>({
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    licenseNumber: { type: String, required: true },
    rating: { type: Number, default: 0 },
    // vehicles: [{ type: Schema.Types.ObjectId, ref: 'Vehicle', default: [] }],
    status: { type: String, enum: Object.values(DriverStatus), default: DriverStatus.OFFLINE },
    approved: { type: Boolean, default: false },
    location: { type: locationSchema, default: null },
    activeRide: { type: Schema.Types.ObjectId, ref: 'Ride', default: null },
    earnings: { type: Number, default: 0 }
}, {
    timestamps: true,
    versionKey: false
})

export const Driver = model<IDriver>('Driver', driverSchema);