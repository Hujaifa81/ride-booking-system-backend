
import { Driver } from "../modules/driver/driver.model";
import { Ride } from "../modules/ride/ride.model";

export const findNearestAvailableDriver = async (rideId: string) => {
    const ride = await Ride.findById(rideId);
    if (!ride) throw new Error("Ride not found");

    const driver = await Driver.findOne({
        online: true,
        approved: true,
        activeRide: null,
        _id: { $nin: ride.rejectedDrivers },
        location: {
            $near: {
                $geometry: { type: "Point", coordinates: ride.pickupLocation.coordinates },
                $maxDistance: 5000 // 5 km radius
            }
        }
    }).populate("user").lean();



    return driver || null;
}
