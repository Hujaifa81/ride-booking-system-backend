"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VehicleService = void 0;
const vehicle_model_1 = require("./vehicle.model");
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const AppError_1 = __importDefault(require("../../errorHelpers/AppError"));
const user_model_1 = require("../user/user.model");
const createVehicle = (payload, token) => __awaiter(void 0, void 0, void 0, function* () {
    const isVehicleExist = yield vehicle_model_1.Vehicle.findOne({ licensePlate: payload.licensePlate });
    if (isVehicleExist) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "Vehicle already exists for this license plate");
    }
    const isUserExist = yield user_model_1.User.findOne({ _id: token.userId });
    if (!isUserExist) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "User is not created. Please create a user first.");
    }
    if (isUserExist.isVerified === false) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You are not verified yet. Please verify your account first.");
    }
    const vehicle = yield vehicle_model_1.Vehicle.create(Object.assign(Object.assign({}, payload), { user: token.userId }));
    return vehicle;
});
const getMyVehicles = (token) => __awaiter(void 0, void 0, void 0, function* () {
    const vehicles = yield vehicle_model_1.Vehicle.find({ user: token.userId, isDeleted: false });
    return vehicles;
});
const activeVehicleStatusChange = (vehicleId, token) => __awaiter(void 0, void 0, void 0, function* () {
    const vehicle = yield vehicle_model_1.Vehicle.findOne({ _id: vehicleId, user: token.userId });
    if (!vehicle) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Vehicle not found");
    }
    vehicle.isActive = !vehicle.isActive;
    yield vehicle.save();
    return vehicle;
});
exports.VehicleService = {
    createVehicle,
    getMyVehicles,
    activeVehicleStatusChange
};
