import { DriverStatus, ILocation } from "../modules/driver/driver.interface";
import { Driver } from "../modules/driver/driver.model";
import { RideStatus } from "../modules/ride/ride.interface";
import { Ride } from "../modules/ride/ride.model";
import { kmCalculation } from "./kmCalculation";
import { getSurgeMultiplier, getTimeBasedSurge } from "./surge";




export const approxFareCalculation = (
    pickupLocation: ILocation,
    dropOffLocation: ILocation
): number => {
    const km = kmCalculation(pickupLocation, dropOffLocation);
    // --- Fare Calculation ---
    const baseFare = 50;
    const perKm = 25;
    const perMinute = 5;

    const timeInMinutes = (km / 40) * 60; // assuming avg 40 km/h

    const approxTotalFare = baseFare + km * perKm + timeInMinutes * perMinute;

    return Math.round(approxTotalFare);
};


export const PenaltyFareForExceedingTime = (startTime: Date, completedTime: Date, pickupLocation: ILocation, dropOffLocation: ILocation): number => {
    const durationInMinutes = (completedTime.getTime() - startTime.getTime()) / (1000 * 60);
    const km = kmCalculation(pickupLocation, dropOffLocation);
    const expectedDuration = (km / 40) * 60; // Assuming average speed of 40 km/h

    if (durationInMinutes > expectedDuration) {
        const extraTime = durationInMinutes - expectedDuration;
        const penaltyPerMinute = 10; // Penalty rate per extra minute
        return extraTime * penaltyPerMinute;
    }
    return 0;
}



export const calculateApproxFareWithSurge =async (pickupLocation: ILocation, dropOffLocation: ILocation): Promise<number> => {

    //find all available drivers within 5km radius
    const totalDriversNearBy = await Driver.countDocuments({
        status: DriverStatus.AVAILABLE,
        approved: true,
        activeRide: null,
        location: {
            $near: {
                $geometry: { type: "Point", coordinates: pickupLocation.coordinates },
                $maxDistance: 5000 // 5 km radius
            }
        }
    })

    // Active ride requests nearby
    const totalActiveRides = await Ride.countDocuments({
      status:{ $in: [RideStatus.PENDING,RideStatus.REQUESTED] },
      pickupLocation: {
        $near: {
          $geometry: { type: "Point", coordinates: pickupLocation.coordinates },
          $maxDistance: 3000,
        },
      },
    });

    const demandSurge = getSurgeMultiplier(totalActiveRides, totalDriversNearBy);

    // Time-based minimum surge
    const timeSurge = getTimeBasedSurge();

    // Apply the **higher** of the two
    const finalSurge = Math.max(demandSurge, timeSurge);

    const approxFare = approxFareCalculation(pickupLocation, dropOffLocation) * finalSurge;

    return Math.round(approxFare);

}

export const finalFareCalculation = (approxFare: number, penaltyFare: number): number => {
    return approxFare + penaltyFare;
}

export const driverEarningCalculation = (finalFare: number): number => {
    const driverSharePercentage = 0.75; // Assuming driver gets 75% of the final fare
    return finalFare * driverSharePercentage;
}
