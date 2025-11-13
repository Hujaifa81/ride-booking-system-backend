import { Types } from "mongoose";
import { IUser } from "../user/user.interface";

export enum DriverStatus {
    AVAILABLE = "AVAILABLE",
    ON_TRIP = "ON_TRIP",
    OFFLINE = "OFFLINE"
}
export interface ILocation {
  type?: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IDriver {
    _id?: Types.ObjectId;
    user: Types.ObjectId | IUser;
    licenseNumber: string;
    rating?: number;
    // vehicles?: Types.ObjectId[];
    status:DriverStatus;
    approved?: boolean;
    location?: ILocation | null;
    activeRide?: Types.ObjectId | null;
    earnings?: number | 0;
    isSuspended?: boolean;
}