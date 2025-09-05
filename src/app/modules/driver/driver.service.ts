import { JwtPayload } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { DriverStatus, IDriver, ILocation } from "./driver.interface";
import { Driver } from "./driver.model";
import httpStatus from "http-status-codes";
import { Vehicle } from "../vehicle/vehicle.model";
import { User } from "../user/user.model";
import { Role } from "../user/user.interface";
import { Ride } from "../ride/ride.model";
import { driverEarningCalculation } from "../../utils/fareCalculation";
import { RideStatus } from "../ride/ride.interface";
import { QueryBuilder } from "../../utils/queryBuilder";
import { driverSearchableFields } from "./driver.constant";


const createDriver = async (payload: Partial<IDriver>, token: JwtPayload) => {

  const isDriverExist = await Driver.findOne({ user: token.userId });

  if (isDriverExist) {
    throw new AppError(httpStatus.BAD_REQUEST, "Driver already exists with this user");
  }

  const user = await User.findById(token.userId);

  if(!user?.phone){
    throw new AppError(httpStatus.BAD_REQUEST, "Please add phone number to your profile first.");
  }

  if (!user || !user.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "You are not verified yet. Please verify your account first.");
  }

  const isAnyVehicleExist = await Vehicle.findOne({ user: token.userId });

  if (!isAnyVehicleExist) {
    throw new AppError(httpStatus.BAD_REQUEST, "User does not have any vehicle. Please add a vehicle first.");
  }

  const driver = await Driver.create({
    ...payload,
    user: token.userId,
  });



  return driver;
}

const getAllDrivers = async (query: Record<string, string>) => {
  const queryBuilder = new QueryBuilder(Driver.find(), query)
  const drivers = await queryBuilder
    .geoLocationSearch()
    .search(driverSearchableFields)
    .filter()
    .sort()
    .fields()
    .paginate()

  const [data, meta] = await Promise.all([
    drivers.build(),
    queryBuilder.getMeta()
  ])

  const driversWithCars = await Promise.all(
    data.map(async (driver) => {
      const vehicles = await Vehicle.find({ user: driver.user });
      return {
        ...driver.toObject(),
        vehicles
      };
    })
  );
  return { meta, data: driversWithCars };
}

const driverApprovedStatusChange = async (driverId: string) => {
  const driver = await Driver.findById(driverId);
  const user = await User.findById(driver?.user);


  if (!driver) {
    throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
  }
  driver.approved = !driver.approved;
  await driver.save();

  if (user) {
    user.role = driver.approved ? Role.DRIVER : Role.RIDER;
    await user.save();
  }

  return { driver, user };
}

const driverStatusChange = async (updateStatus: string, token: JwtPayload) => {

  const driver = await Driver.findOne({ user: token.userId });
  const vehicles = await Vehicle.find({ user: token.userId });

  if (!driver) {
    throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
  }

  if (driver?.user?.toString() !== token.userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "You do not have permission to change this driver's status");
  }

  if (driver.isSuspended) {
    throw new AppError(httpStatus.FORBIDDEN, "You are suspended by admin. You cannot change your status.");
  }

  if (!driver.approved) {
    throw new AppError(httpStatus.BAD_REQUEST, "User is not approved as a driver yet.");
  }

  if (driver.status === DriverStatus.ON_TRIP) {
    throw new AppError(httpStatus.BAD_REQUEST, "You cannot change status while on trip");
  }

  if (updateStatus === DriverStatus.AVAILABLE) {
    const activeVehicle = vehicles.some(vehicle => vehicle.isActive === true);
    if (!activeVehicle) {
      throw new AppError(httpStatus.BAD_REQUEST, "Do not have any active vehicle. Please activate a vehicle first.");
    }
    if (!driver.location) {
      throw new AppError(httpStatus.BAD_REQUEST, "Update location first to go available.");
    }
  }

  if (updateStatus === DriverStatus.ON_TRIP) {
    throw new AppError(httpStatus.BAD_REQUEST, "You cannot change status to ON_TRIP. This is done by the system when a ride is accepted.");
  }


  if ((updateStatus !== DriverStatus.AVAILABLE) && (updateStatus !== DriverStatus.OFFLINE)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid status change request");
  }


  driver.status = updateStatus as DriverStatus;
 
  await driver.save();

  if (driver.status === DriverStatus.OFFLINE) {
    driver.location = null;
    await driver.save();
  }

  return driver;
}

const driverLocationUpdate = async (location: ILocation, token: JwtPayload) => {

  const driver = await Driver.findOne({ user: token.userId });

  if (!driver) {
    throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
  }

  if (driver.user.toString() !== token.userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "You do not have permission to update this driver's location");
  }

  if (driver.status === DriverStatus.ON_TRIP) {
    throw new AppError(httpStatus.BAD_REQUEST, "You cannot change location while on trip");
  }

  driver.location = location;
  await driver.save();

  return driver;
}

const getDriverEarningsHistory = async (driverId: string, token: JwtPayload) => {
  const driver = await Driver.findById(driverId);
  const rides = await Ride.find({ driver: driverId, status: RideStatus.COMPLETED });

  if (!driver) {
    throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
  }
  if (driver.user.toString() !== token.userId && token.role !== Role.ADMIN) {
    throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized to view this earnings history");
  }

  const earningsHistoryFromRides = rides.map(ride => {
    const earningCalculation = driverEarningCalculation(Number(ride?.finalFare));
    return {
      rideId: ride._id,
      fare: ride.finalFare,
      earningFromThisRide: earningCalculation,
      pickupLocation: ride.pickupLocation,
      dropOffLocation: ride.dropOffLocation,

    }
  })

  return earningsHistoryFromRides;
}

const driverSuspendedStatusChange = async (driverId: string, isSuspended: boolean) => {
  const driver = await Driver.findById(driverId);
  if (!driver) {
    throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
  }
  if (driver.isSuspended === isSuspended) {
    throw new AppError(httpStatus.BAD_REQUEST, `Driver is already ${isSuspended ? 'suspended' : 'active'}`);
  }

  driver.isSuspended = isSuspended;
  await driver.save();
  return driver;
}

const updateDriverRating = async (driverId: string, rating: number, rideId: string, token: JwtPayload) => {
  const driver = await Driver.findById(driverId);
  const ride = await Ride.findById(rideId);
  const totalRidesWithRating = await Ride.find({ driver: driverId, status: RideStatus.COMPLETED, rating: { $ne: null } });

  if (token.role !== Role.RIDER) {
    throw new AppError(httpStatus.FORBIDDEN, "Only riders can rate drivers");
  }
  if (!driver) {
    throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
  }
  if (!ride) {
    throw new AppError(httpStatus.NOT_FOUND, "Ride not found");
  }
  if (ride.user.toString() !== token.userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized to rate this driver for this ride");
  }
  if (ride.driver?.toString() !== driverId) {
    throw new AppError(httpStatus.BAD_REQUEST, "This driver was not assigned to this ride");
  }
  if (ride.status !== RideStatus.COMPLETED) {
    throw new AppError(httpStatus.BAD_REQUEST, "You can rate the driver only after the ride is completed");
  }
  if (ride.rating) {
    throw new AppError(httpStatus.BAD_REQUEST, "You have already rated this driver for this ride");
  }
  const totalRating = totalRidesWithRating.length ? totalRidesWithRating.reduce((acc, curr) => acc + (curr.rating || 0), 0) : 0;
  const newAverageRating = (totalRating + rating) / (totalRidesWithRating.length + 1);
  driver.rating = newAverageRating;
  await driver.save();
  ride.rating = rating;
  await ride.save();
  return { driver, ride };
}



export const DriverService = {
  createDriver,
  getAllDrivers,
  driverApprovedStatusChange,
  driverStatusChange,
  driverLocationUpdate,
  getDriverEarningsHistory,
  driverSuspendedStatusChange,
  updateDriverRating
};