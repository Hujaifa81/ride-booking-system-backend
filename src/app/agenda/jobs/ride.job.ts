/* eslint-disable @typescript-eslint/no-explicit-any */
import { agenda } from "../agenda";
import { Ride } from "../../modules/ride/ride.model";
import { IRide, RideStatus } from "../../modules/ride/ride.interface";
import { findNearestAvailableDriver } from "../../utils/findNearestAvailableDriver";
import { Vehicle } from "../../modules/vehicle/vehicle.model";
import { emitToDriverThatRideHasBeenCancelledOrTimeOut, emitToDriverThatHeHasNewRideRequest, emitStatusChange } from "../../utils/socket";
import { IDriver } from "../../modules/driver/driver.interface";
import { User } from "../../modules/user/user.model";
import { IsActive } from "../../modules/user/user.interface";

agenda.define("driverResponseTimeout", async (job: any) => {

  const { rideId, driverId } = job.attrs.data as { rideId: string; driverId: string };

  const ride = await Ride.findById(rideId).populate("driver").populate("user");


  // Compare as strings to avoid ObjectId mismatch
  const rideDriverId = ride?.driver?._id?.toString();
  const expectedDriverId = String(driverId);



  if (
    !ride ||
    ride.status !== RideStatus.REQUESTED ||
    rideDriverId !== expectedDriverId
  ) {
    return;
  }

  console.log(`[driverResponseTimeout] Timeout! Driver ${driverId} did not respond. Finding new driver...`);

  // Emit timeout message to driver
  const driverUser = (ride.driver as IDriver).user;
  emitToDriverThatRideHasBeenCancelledOrTimeOut(driverUser.toString(), rideId);

  // Remove current driver and find a new one
  if (ride.driver && ride.driver._id) {
    ride.rejectedDrivers.push(ride.driver._id);
  }
  ride.driver = null;
  ride.vehicle = null;
  await ride.save();

  // Cancel timeout job for this driver
  await agenda.cancel({
    name: "driverResponseTimeout",
    "data.rideId": rideId,
    "data.driverId": driverId,
  });

  const newDriver = await findNearestAvailableDriver(rideId);

  if (newDriver) {
    console.log(`[driverResponseTimeout] Found new driver ${newDriver._id}`);
    ride.driver = newDriver._id;
    const activeVehicle = await Vehicle.findOne({ user: newDriver.user, isActive: true });
    ride.vehicle = activeVehicle?._id;
    await ride.save();

    // Schedule timeout for new driver
    await agenda.schedule("5 minutes", "driverResponseTimeout", {
      rideId: rideId,
      driverId: newDriver._id.toString(),
    });

    // Notify new driver
    const rideWithDriver = await Ride.findById(rideId).populate("driver").populate("user");
    emitToDriverThatHeHasNewRideRequest(newDriver.user.toString(), rideWithDriver as IRide);
  } else {
    console.log(`[driverResponseTimeout] No new driver found. Setting ride to PENDING`);
    ride.status = RideStatus.PENDING;
    ride.statusHistory.push({
      status: RideStatus.PENDING,
      timestamp: new Date(),
      by: "SYSTEM",
    });
    await ride.save();

    // Start repeating job to retry every 30 seconds
    await agenda.every("30 seconds", "checkPendingRide", { rideId: rideId });
  }
});

agenda.define("checkPendingRide", async (job: any) => {
  console.log("[checkPendingRide] Job started for rideId:", job.attrs.data.rideId);
  const { rideId } = job.attrs.data as { rideId: string };

  const ride = await Ride.findById(rideId);

  if (!ride || ride.status !== RideStatus.PENDING) {
    console.log("[checkPendingRide] Ride not in PENDING status or not found");
    await agenda.cancel({ name: "checkPendingRide", "data.rideId": rideId });
    return;
  }

  const now = Date.now(); const createdAt = new Date(ride.createdAt as Date).getTime();
  // Cancel ride if pending > 10 minute from creation
  if (now - createdAt >= 10 * 60 * 1000) {
    ride.status = RideStatus.CANCELLED_FOR_PENDING_TIME_OVER;
    ride.driver = null;
    ride.vehicle = null;
    ride.canceledReason = 'No drivers available';
    ride.statusHistory.push({
      status: RideStatus.CANCELLED_FOR_PENDING_TIME_OVER,
      timestamp: new Date(),
      by: 'SYSTEM'
    });
    await ride.save();
    emitStatusChange(rideId, RideStatus.CANCELLED_FOR_PENDING_TIME_OVER, ride.user.toString());
    await agenda.cancel({ name: "checkPendingRide", "data.rideId": ride._id.toString() });
    await agenda.cancel({ name: "driverResponseTimeout", "data.rideId": ride._id.toString() });
    console.log(`Ride ${rideId} cancelled after 10 mins`); return;
  }
  const newDriver = await findNearestAvailableDriver(rideId);

  if (newDriver) {
    console.log(`[checkPendingRide] Found driver ${newDriver._id}`);
    ride.driver = newDriver._id;
    ride.status = RideStatus.REQUESTED;
    const activeVehicle = await Vehicle.findOne({ user: newDriver.user, isActive: true });
    ride.vehicle = activeVehicle?._id;
    await ride.save();

    // Cancel the repeating job
    await agenda.cancel({ name: "checkPendingRide", "data.rideId": rideId });

    // Schedule timeout for this driver
    await agenda.schedule("5 minutes", "driverResponseTimeout", {
      rideId: rideId,
      driverId: newDriver._id.toString(),
    });

    // Notify driver
    const rideWithDriver = await Ride.findById(rideId).populate("driver").populate("user");
    emitToDriverThatHeHasNewRideRequest(newDriver.user.toString(), rideWithDriver as IRide);
  } else {
    console.log("[checkPendingRide] No driver available yet, will retry in 30 seconds");
  }
});

// when user is blocked for 3 time cancellation in a day, unblock after 24 hours
agenda.define("unblockUserAfter24Hours", async (job: any) => {
  const { userId } = job.attrs.data as { userId: string };
  const user = await User.findById(userId);
  if (user && user.isActive === IsActive.BLOCKED) {
    user.isActive = IsActive.ACTIVE;
    await user.save();
    console.log(`User ${userId} has been unblocked after 24 hours`);
    await agenda.cancel({ name: "unblockUserAfter24Hours", "data.userId": userId });
  }
});


