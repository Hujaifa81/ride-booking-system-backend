import { Types } from "mongoose";
import { ILocation } from "../driver/driver.interface";

export enum RideStatus {
    'REQUESTED' = 'REQUESTED',
    'ACCEPTED' = 'ACCEPTED',
    'PICKED_UP' = 'PICKED_UP',
    'IN_TRANSIT' = 'IN_TRANSIT',
    'COMPLETED' = 'COMPLETED',
    'CANCELED_BY_RIDER' = 'CANCELED_BY_RIDER',
    'CANCELED_BY_DRIVER' = 'CANCELED_BY_DRIVER',
    'CANCELED_BY_ADMIN' = 'CANCELED_BY_ADMIN'
}
export interface IStatusLog {
    status: RideStatus;
    timestamp: Date;
    by:Types.ObjectId;
}

export interface IRide {
    _id?: Types.ObjectId;
    riderId: Types.ObjectId;
    driverId?: Types.ObjectId;
    vehicleId?: Types.ObjectId;
    pickupLocation: ILocation;
    dropOffLocation: ILocation;
    status: RideStatus;
    fare?: number;
    distance?: number; // in kilometers
    duration?: number; // in seconds
    statusHistory: IStatusLog[];
    canceledReason?: string;
}