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
    approxFare: { type: Number },
    finalFare: { type: Number },
    distance: { type: Number },
    duration: { type: Number },
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    driver: { type: Schema.Types.ObjectId, ref: 'Driver', default: null },
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    status: { type: String, enum: Object.values(RideStatus), default: RideStatus.REQUESTED },
    statusHistory: [{ type: statusLogSchema, default: []}],
    canceledReason: { type: String },
    rejectedDrivers: [{ type: Schema.Types.ObjectId, ref: 'Driver', default: [] }]
}, {
    timestamps: true,
    versionKey: false
})
export const Ride = model<IRide>('Ride', rideSchema);