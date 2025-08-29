import { Types } from "mongoose";
import { ILocation } from "../driver/driver.interface";

export enum RideStatus {
    'REQUESTED' = 'REQUESTED',
    'PENDING' = 'PENDING',
    'ACCEPTED' = 'ACCEPTED',
    'GOING_TO_PICK_UP' = 'GOING_TO_PICK_UP',
    'DRIVER_ARRIVED' = 'DRIVER_ARRIVED',
    'IN_TRANSIT' = 'IN_TRANSIT',
    'REACHED_DESTINATION' = 'REACHED_DESTINATION',
    'COMPLETED' = 'COMPLETED',
    'CANCELLED_BY_RIDER' = 'CANCELLED_BY_RIDER',
    'CANCELLED_BY_DRIVER' = 'CANCELLED_BY_DRIVER',
    'CANCELLED_BY_ADMIN' = 'CANCELLED_BY_ADMIN',
    'CANCELLED_FOR_PENDING_TIME_OVER' = 'CANCELLED_FOR_PENDING_TIME_OVER',
}
export interface IStatusLog {
    status: RideStatus;
    timestamp: Date;
    by:Types.ObjectId | 'SYSTEM';
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
    rejectedDrivers: Types.ObjectId[];
    createdAt?: Date;
    rating?: number;
    feedback?: string;
}