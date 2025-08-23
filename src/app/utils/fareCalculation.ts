import { ILocation } from "../modules/driver/driver.interface";

export const approxFareCalculation = (pickupLocation: ILocation, dropOffLocation: ILocation):number => {
    const dx = dropOffLocation.lat - pickupLocation.lat;
    const dy = dropOffLocation.lng - dropOffLocation.lng;
    const km = Math.sqrt(dx * dx + dy * dy) * 111;
    const base = 50; 
    const perKm = 25;
    const approxTotalFare = base + (perKm * km);
    return Math.round(approxTotalFare);
}

export const PenaltyFareForExceedingTime = (startTime: number,completedTime:number,pickupLocation: ILocation, dropOffLocation: ILocation): number => {
    const durationInMinutes = (completedTime - startTime) / (1000 * 60);
    const dx = dropOffLocation.lat - pickupLocation.lat;
    const dy = dropOffLocation.lng - dropOffLocation.lng;
    const km = Math.sqrt(dx * dx + dy * dy) * 111;
    const expectedDuration = (km / 40) * 60; // Assuming average speed of 40 km/h
    if (durationInMinutes > expectedDuration) {
        const extraTime = durationInMinutes - expectedDuration;
        const penaltyPerMinute = 10; // Penalty rate per extra minute
        return extraTime * penaltyPerMinute;
    }
    return 0;
}

export const finalFareCalculation = (approxFare: number,penaltyFare:number):number => {
    return approxFare + penaltyFare;
}