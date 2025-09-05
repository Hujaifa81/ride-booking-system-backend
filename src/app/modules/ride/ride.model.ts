import { model, Schema } from "mongoose";
import { IRide, IStatusLog, RideStatus } from "./ride.interface";
import { locationSchema } from "../driver/driver.model";

const statusLogSchema = new Schema<IStatusLog>({
    status: { type: String, enum: Object.values(RideStatus), required: true },
    timestamp: { type: Date, default: Date.now },
    by: { type: Schema.Types.Mixed, required: true }
},{
    _id: false,
    versionKey: false
})

const rideSchema = new Schema<IRide>({
    pickupLocation: { type: locationSchema, required: true },
    dropOffLocation: { type: locationSchema, required: true },
    approxFare: { type: Number },
    finalFare: { type: Number },
    distance: { type: Number },
    duration: { type: Number },
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    driver: { type: Schema.Types.ObjectId, ref: 'Driver', default: null },
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    status: { type: String, enum: Object.values(RideStatus), default: RideStatus.REQUESTED },
    statusHistory: [{ type: statusLogSchema, default: []}],
    canceledReason: { type: String, max: 500 },
    rejectedDrivers: [{ type: Schema.Types.ObjectId, ref: 'Driver', default: [] }],
    rating: { type: Number, min: 1, max: 5, default: null },
    feedback: { type: String, max: 500 }
}, {
    timestamps: true,
    versionKey: false
})

rideSchema.index({ "pickupLocation": "2dsphere" });
rideSchema.index({ "dropOffLocation": "2dsphere" });


export const Ride = model<IRide>('Ride', rideSchema);