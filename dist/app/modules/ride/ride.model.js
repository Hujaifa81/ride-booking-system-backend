"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ride = void 0;
const mongoose_1 = require("mongoose");
const ride_interface_1 = require("./ride.interface");
const driver_model_1 = require("../driver/driver.model");
const statusLogSchema = new mongoose_1.Schema({
    status: { type: String, enum: Object.values(ride_interface_1.RideStatus), required: true },
    timestamp: { type: Date, default: Date.now },
    by: { type: mongoose_1.Schema.Types.Mixed, required: true }
}, {
    _id: false,
    versionKey: false
});
const rideSchema = new mongoose_1.Schema({
    pickupLocation: { type: driver_model_1.locationSchema, required: true },
    dropOffLocation: { type: driver_model_1.locationSchema, required: true },
    approxFare: { type: Number },
    finalFare: { type: Number },
    distance: { type: Number },
    duration: { type: Number },
    user: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'User' },
    driver: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', default: null },
    vehicle: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    status: { type: String, enum: Object.values(ride_interface_1.RideStatus), default: ride_interface_1.RideStatus.REQUESTED },
    statusHistory: [{ type: statusLogSchema, default: [] }],
    canceledReason: { type: String, max: 500 },
    rejectedDrivers: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', default: [] }],
    rating: { type: Number, min: 1, max: 5, default: null },
    feedback: { type: String, max: 500 }
}, {
    timestamps: true,
    versionKey: false
});
rideSchema.index({ "pickupLocation": "2dsphere" });
rideSchema.index({ "dropOffLocation": "2dsphere" });
exports.Ride = (0, mongoose_1.model)('Ride', rideSchema);
