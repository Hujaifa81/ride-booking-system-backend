import { Types } from "mongoose";

export enum DriverStatus {
    AVAILABLE = "AVAILABLE",
    ON_TRIP = "ON_TRIP",
    OFFLINE = "OFFLINE"
}
export interface ILocation{
    lat: number;
    lng: number;
}
export interface IDriver {
    _id?: Types.ObjectId;
    user: Types.ObjectId;
    licenseNumber: string;
    rating?: number;
    // vehicles?: Types.ObjectId[];
    status:DriverStatus;
    approved?: boolean;
    location?: ILocation | null;
    activeRide?: Types.ObjectId | null;
    earnings?: number;
}