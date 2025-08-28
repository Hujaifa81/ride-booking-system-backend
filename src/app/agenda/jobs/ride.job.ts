/* eslint-disable @typescript-eslint/no-explicit-any */

import { RideStatus } from "../../modules/ride/ride.interface";
import { Ride } from "../../modules/ride/ride.model";
import { findNearestAvailableDriver } from "../../utils/findNearestAvailableDriver";
import { agenda } from "../agenda";


// Define all jobs here (only once)
agenda.define("driverResponseTimeout", async (job: any) => {
  const { rideId, driverId } = job.attrs.data as { rideId: string; driverId: string };
  const ride = await Ride.findById(rideId);

  if (!ride || ride.status !== RideStatus.REQUESTED || ride?.driver?.toString() !== driverId) return;

  console.log(`Driver ${driverId} did not respond in time for ride ${rideId}`);

  ride.rejectedDrivers.push(ride.driver);
  ride.driver = null;
  await ride.save();

  const newDriver = await findNearestAvailableDriver(rideId);

  if (newDriver) {
    ride.driver = newDriver._id;
    ride.status = RideStatus.REQUESTED;
    await ride.save();

    // cancel old timeout job
    await agenda.cancel({ name: "driverResponseTimeout", "data.rideId": ride._id.toString(), "data.driverId": driverId });

    // schedule new timeout job for new driver
    await agenda.schedule("1 minute", "driverResponseTimeout", {
      rideId: ride._id.toString(),
      driverId: newDriver._id.toString(),
    });
  } else {
    ride.status = RideStatus.PENDING;
    ride.driver = null;
    await ride.save();

    try {
      await agenda.every("30 seconds", "checkPendingRide", { rideId: ride._id.toString() });
    } catch (err) {
      console.error(`[ERROR] Failed to schedule checkPendingRide job for ride ${ride._id.toString()}:`, err);
    }
  }
});

agenda.define("checkPendingRide", async (job: any) => {
  const { rideId } = job.attrs.data as { rideId: string };
  console.log(rideId); const ride = await Ride.findById(rideId);
  if (!ride || ride.status !== RideStatus.PENDING) return;
  const now = Date.now(); const createdAt = new Date(ride.createdAt as Date).getTime();
  // Cancel ride if pending > 2 minute from creation
  if (now - createdAt >= 2 * 60 * 1000) {
    ride.status = RideStatus.CANCELLED_FOR_PENDING_TIME_OVER;
    ride.statusHistory.push({
      status: RideStatus.CANCELLED_FOR_PENDING_TIME_OVER,
      timestamp: new Date(),
      by: 'SYSTEM'
    });
    await ride.save();
    await agenda.cancel({ name: "checkPendingRide", "data.rideId": ride._id.toString() });
    await agenda.cancel({ name: "driverResponseTimeout", "data.rideId": ride._id.toString() });
    console.log(`Ride ${rideId} cancelled after 2 mins`); return;
  }
  // Try to assign a driver again 
  const driver = await findNearestAvailableDriver(rideId.toString());
  console.log(driver);
  if (driver) {
    console.log("driver paichi");
    ride.driver = driver._id;
    ride.status = RideStatus.REQUESTED;
    await ride.save();
    await agenda.cancel({ name: "driverResponseTimeout", "data.rideId": ride._id.toString() });
    // Schedule new timeout job for the newly assigned driver 
    await agenda.schedule("1 minute", "driverResponseTimeout", { rideId: ride._id.toString(), driverId: driver._id.toString() });
    await agenda.cancel({ name: "checkPendingRide", "data.rideId": ride._id.toString() });
  }
  
}); 
                
