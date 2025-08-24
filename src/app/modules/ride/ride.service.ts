import { JwtPayload } from "jsonwebtoken";
import { IRide, RideStatus } from "./ride.interface";
import { Ride } from "./ride.model";
import { approxFareCalculation } from "../../utils/fareCalculation";
import httpStatus from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { acceptRide, cancelRide, completedRide, driverArrived, goingToPickup, inTransitRide, reachedDestinationRide } from "../../utils/rideStatusChange";


const createRide = async (rideData: Partial<IRide>, token: JwtPayload) => {
    const rides = await Ride.find({ user: token.userId, status: { $in: [RideStatus.ACCEPTED, RideStatus.IN_TRANSIT, RideStatus.GOING_TO_PICK_UP,RideStatus.DRIVER_ARRIVED,RideStatus.REQUESTED] } });

    if (rides.length > 0) {
        throw new AppError(httpStatus.BAD_REQUEST, "You have an ongoing ride. Please complete or cancel the current ride before requesting a new one.");
    }

    if (rideData.pickupLocation && rideData.dropOffLocation) {
        if (rideData.pickupLocation.lat === rideData.dropOffLocation.lat && rideData.pickupLocation.lng === rideData.dropOffLocation.lng) {
            throw new AppError(httpStatus.BAD_REQUEST, "Pickup and drop-off locations cannot be the same.");
        }
    }
    let approxFare = 0;

    if (rideData.pickupLocation && rideData.dropOffLocation) {
        approxFare = approxFareCalculation(rideData.pickupLocation, rideData.dropOffLocation);
    }
    rideData.approxFare = approxFare;

    const ride = await Ride.create({
        ...rideData,
        user: token.userId,
    });

    ride.statusHistory.push({
        status: RideStatus.REQUESTED,
        by: token.userId,
        timestamp: new Date()
    })
    ride.save()

    return ride;
}

const rideStatusChange = async (rideId: string, status:RideStatus, token: JwtPayload) => {

    if (status === RideStatus.ACCEPTED) {
        
            const ride = await acceptRide(rideId, token);
            return ride;
    }

    if (status === RideStatus.GOING_TO_PICK_UP) {
        
            const ride = await goingToPickup(rideId, token);
            return ride;   
        
    }

    if (status === RideStatus.DRIVER_ARRIVED) {
        
            const ride = await driverArrived(rideId, token);
            return ride;    
        
    }

    if (status === RideStatus.IN_TRANSIT) {
        
                const ride = await inTransitRide(rideId, token);
                return ride;
            
        
    }

    if (status === RideStatus.REACHED_DESTINATION) {
        
            const ride = await reachedDestinationRide(rideId, token);
            return ride;
        
    }

    if (status === RideStatus.COMPLETED) {
        const ride= await completedRide(rideId,token);
        return ride;
    }
    
}

const canceledRide=async (rideId:string,canceledReason:string, token: JwtPayload) => {
    const ride=cancelRide(rideId,canceledReason,token);
    return ride;
}

export const RideService = {
    createRide,
    rideStatusChange,
    canceledRide
};