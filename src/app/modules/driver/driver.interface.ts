import { Types } from "mongoose";

export enum DriverStatus {
    AVAILABLE = "AVAILABLE",
    UNAVAILABLE = "UNAVAILABLE",
    ON_TRIP = "ON_TRIP",
    OFFLINE = "OFFLINE"
}
export interface IDriver {
    _id?: Types.ObjectId;
    userId: Types.ObjectId;
    licenseNumber?: string;
    rating?: number;
    vehicles?: Types.ObjectId[];
    status:DriverStatus;
}