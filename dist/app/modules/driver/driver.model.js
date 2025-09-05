"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Driver = exports.locationSchema = void 0;
const mongoose_1 = require("mongoose");
const driver_interface_1 = require("./driver.interface");
exports.locationSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ["Point"], // GeoJSON Point type
        required: true,
        default: "Point"
    },
    coordinates: {
        type: [Number],
        required: true,
        validate: {
            validator: function (arr) {
                return arr.length === 2 &&
                    arr[0] >= -180 && arr[0] <= 180 &&
                    arr[1] >= -90 && arr[1] <= 90;
            },
            message: 'Coordinates must be [longitude, latitude]'
        }
    }
}, {
    _id: false,
    versionKey: false
});
const driverSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'User' },
    licenseNumber: { type: String, required: true, unique: true },
    rating: { type: Number, default: 0 },
    // vehicles: [{ type: Schema.Types.ObjectId, ref: 'Vehicle', default: [] }],
    status: { type: String, enum: Object.values(driver_interface_1.DriverStatus), default: driver_interface_1.DriverStatus.OFFLINE },
    approved: { type: Boolean, default: false },
    location: { type: exports.locationSchema, default: null },
    activeRide: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Ride', default: null },
    earnings: { type: Number, default: 0 },
    isSuspended: { type: Boolean, default: false }
}, {
    timestamps: true,
    versionKey: false
});
driverSchema.index({ location: "2dsphere" });
exports.Driver = (0, mongoose_1.model)('Driver', driverSchema);
