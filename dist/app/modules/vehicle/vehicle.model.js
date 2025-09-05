"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vehicle = void 0;
const mongoose_1 = require("mongoose");
const vehicleSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'User' },
    licensePlate: { type: String, required: true, unique: true },
    make: { type: String },
    model: { type: String, required: true },
    type: { type: String },
    capacity: { type: Number },
    isActive: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }
}, {
    timestamps: true,
    versionKey: false
});
exports.Vehicle = (0, mongoose_1.model)('Vehicle', vehicleSchema);
