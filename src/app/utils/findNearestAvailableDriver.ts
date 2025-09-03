import { DriverStatus } from "../modules/driver/driver.interface";
import { Driver } from "../modules/driver/driver.model";
import { Ride } from "../modules/ride/ride.model";
import { IsActive } from "../modules/user/user.interface";


export const findNearestAvailableDriver = async (rideId: string) => {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new Error("Ride not found");

  // Find all candidate drivers within 5km
  const drivers = await Driver.find({
    status: DriverStatus.AVAILABLE,
    approved: true,
    activeRide: null,
    isSuspended: { $ne: true },
    _id: { $nin: ride.rejectedDrivers || [] },
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: ride.pickupLocation.coordinates },
        $maxDistance: 5000, // 5 km radius
      },
    },
  })
    .populate({
      path: "user",
      match: { isActive: IsActive.ACTIVE, isDeleted: false }, // only active users
    })
    .lean();

  // Filter out drivers where user didn’t match
  const validDrivers = drivers.filter((d) => d.user !== null);

  // Return nearest valid driver (first one, since $near already sorts by distance)
  return validDrivers.length > 0 ? validDrivers[0] : null;
};
