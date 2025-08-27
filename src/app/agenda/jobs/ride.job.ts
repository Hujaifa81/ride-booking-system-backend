/* eslint-disable @typescript-eslint/no-explicit-any */
import { RideStatus } from "../../modules/ride/ride.interface";
import { Ride } from "../../modules/ride/ride.model";
import { findNearestAvailableDriver } from "../../utils/findNearestAvailableDriver";
import { agenda } from "../agenda";

agenda.define("driverResponseTimeout", async (job: any) => {
  const { rideId, driverId } = job.attrs.data as { rideId: string; driverId: string };
  const ride = await Ride.findById(rideId);

  // If ride is already accepted or driver changed, do nothing
  if (!ride || ride.status !== RideStatus.REQUESTED || ride?.driver?.toString() !== driverId) return;

  console.log(`Driver ${driverId} did not respond in time for ride ${rideId}`);

  ride.rejectedDrivers.push(ride.driver);
  ride.driver = null;
  await ride.save();

  // Try to assign next nearest driver
  const newDriver = await findNearestAvailableDriver(rideId);

  if (newDriver) {
    ride.driver = newDriver._id;
    ride.status = RideStatus.REQUESTED;
    await ride.save();
    await agenda.cancel({ name: "driverResponseTimeout", "data.rideId": ride._id, "data.driverId": driverId });
    // Schedule new timeout job for the newly assigned driver
    await agenda.schedule("1 minute", "driverResponseTimeout", { rideId: ride._id, driverId: newDriver._id });

  } else {
    ride.status = RideStatus.PENDING;
    ride.driver = null;
    await ride.save();

    // Start repeating job to retry assignment every 30 sec
    await agenda.every("30 seconds", "checkPendingRide", { rideId: ride._id });
  }
});

agenda.define("checkPendingRide", async (job: any) => {
  const { rideId } = job.attrs.data as { rideId: string };
  const ride = await Ride.findById(rideId);

  if (!ride || ride.status !== RideStatus.PENDING) return;

  const now = Date.now();
  const createdAt = new Date(ride.createdAt as Date).getTime();

  // Cancel ride if pending > 5 minutes from creation
  if (now - createdAt >= 5 * 60 * 1000) {
    ride.status = RideStatus.CANCELLED_FOR_PENDING_TIME_OVER;
    await ride.save();
    await agenda.cancel({ name: "checkPendingRide", "data.rideId": ride._id });
    await agenda.cancel({ name: "driverResponseTimeout", "data.rideId": ride._id });

    console.log(`Ride ${rideId} cancelled after 5 min`);
    return;
  }

  // Try to assign a driver again
  const driver = await findNearestAvailableDriver(rideId);
  if (driver) {
    ride.driver = driver._id;
    ride.status = RideStatus.REQUESTED;
    await ride.save();
    await agenda.cancel({ name: "driverResponseTimeout", "data.rideId": ride._id });
    // Schedule new timeout job for the newly assigned driver
    await agenda.schedule("1 minute", "driverResponseTimeout", { rideId: ride._id, driverId: driver._id });
    await agenda.cancel({ name: "checkPendingRide", "data.rideId": ride._id });
  }
});

