import { ILocation } from "../modules/driver/driver.interface";

export const approxFareCalculation = (pickupLocation: ILocation, dropOffLocation: ILocation):number => {
    const dx = dropOffLocation.coordinates[0] - pickupLocation.coordinates[0];
    const dy = dropOffLocation.coordinates[1] - dropOffLocation.coordinates[1];
    const km = Math.sqrt(dx * dx + dy * dy) * 111;
    const perKm = 25;
    const timeInMinutes = (km / 40) * 60; // Assuming average speed of 40 km/h
    const perMinute = 5;
    const base=50
    const approxTotalFare =base + (perKm * km) + (perMinute * timeInMinutes);
    return Math.round(approxTotalFare);
}

export const PenaltyFareForExceedingTime = (startTime: Date,completedTime:Date,pickupLocation: ILocation, dropOffLocation: ILocation): number => {
    const durationInMinutes = (completedTime.getTime() - startTime.getTime()) / (1000 * 60);
    const dx = dropOffLocation.coordinates[0] - pickupLocation.coordinates[0];
    const dy = dropOffLocation.coordinates[1] - dropOffLocation.coordinates[1];
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

export const driverEarningCalculation = (finalFare: number): number => {
    const driverSharePercentage = 0.75; // Assuming driver gets 75% of the final fare
    return finalFare * driverSharePercentage;
}

