import { model, Schema } from "mongoose";
import { IRide, IStatusLog, RideStatus } from "./ride.interface";

const statusLogSchema = new Schema<IStatusLog>({
    status: { type: String, enum: Object.values(RideStatus), required: true },
    timestamp: { type: Date, default: Date.now },
    by: { type: Schema.Types.ObjectId, required: true }
},{
    _id: false,
    versionKey: false
})

const rideSchema = new Schema<IRide>({
    pickupLocation: { type: Object, required: true },
    dropOffLocation: { type: Object, required: true },
    fare: { type: Number },
    distance: { type: Number },
    duration: { type: Number },
    riderId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    status: { type: String, enum: Object.values(RideStatus), default: RideStatus.REQUESTED },
    statusHistory: [{ type: statusLogSchema, default: []}],
    canceledReason: { type: String }
}, {
    timestamps: true,
    versionKey: false
})
export const Ride = model<IRide>('Ride', rideSchema);