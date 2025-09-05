"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const user_interface_1 = require("./user.interface");
const authProviderSchema = new mongoose_1.Schema({
    provider: { type: String, enum: ['google', 'credentials'], required: true },
    providerId: { type: String, required: true }
}, {
    _id: false,
    versionKey: false
});
const userSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    phone: { type: String },
    picture: { type: String },
    address: { type: String },
    isDeleted: { type: Boolean, default: false },
    isActive: { type: String, enum: Object.values(user_interface_1.IsActive), default: user_interface_1.IsActive.ACTIVE },
    isVerified: { type: Boolean, default: true },
    role: { type: String, enum: Object.values(user_interface_1.Role), default: user_interface_1.Role.RIDER },
    auths: [authProviderSchema]
}, {
    timestamps: true,
    versionKey: false
});
exports.User = (0, mongoose_1.model)('User', userSchema);
