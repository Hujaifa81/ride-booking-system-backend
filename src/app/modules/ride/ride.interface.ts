import { Types } from "mongoose";
import { ILocation } from "../driver/driver.interface";

export enum RideStatus {
    'REQUESTED' = 'REQUESTED',
    'ACCEPTED' = 'ACCEPTED',
    'GOING_TO_PICK_UP' = 'GOING_TO_PICK_UP',
    'DRIVER_ARRIVED' = 'DRIVER_ARRIVED',
    'IN_TRANSIT' = 'IN_TRANSIT',
    'REACHED_DESTINATION' = 'REACHED_DESTINATION',
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
    user: Types.ObjectId;
    driver?: Types.ObjectId | null;
    vehicle?: Types.ObjectId | null;
    pickupLocation: ILocation;
    dropOffLocation: ILocation;
    status: RideStatus;
    approxFare?: number;
    finalFare?: number;
    distance?: number; // in kilometers
    duration?: number; // in seconds
    statusHistory: IStatusLog[];
    canceledReason?: string;
}