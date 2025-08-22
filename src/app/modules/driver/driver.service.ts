import { JwtPayload } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { DriverStatus, IDriver } from "./driver.interface";
import { Driver } from "./driver.model";
import httpStatus from "http-status-codes";
import { Vehicle } from "../vehicle/vehicle.model";
import { User } from "../user/user.model";
import { Role } from "../user/user.interface";

const createDriver = async (payload: Partial<IDriver>, token: JwtPayload) => {

  const isDriverExist = await Driver.findOne({ user: token.userId });

  if (isDriverExist) {
    throw new AppError(httpStatus.BAD_REQUEST, "Driver already exists with this user");
  }

  const isUserVerified = await User.findById(token.userId);

  if (!isUserVerified || !isUserVerified.isVerified) {
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

const getAllDrivers = async () => {
  const drivers = await Driver.find().populate('user');
  const driversWithCars = await Promise.all(
    drivers.map(async (driver) => {
      const vehicles = await Vehicle.find({ user: driver.user });
      return {
        ...driver.toObject(),
        vehicles
      };
    })
  );
  return driversWithCars;
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

const driverStatusChange = async (driverId: string, updateStatus: string, token: JwtPayload) => {

  const driver = await Driver.findById(driverId);
  const vehicles = await Vehicle.find({ user: token.userId });

  if (token.role === Role.DRIVER) {
    if (driver?.user?.toString() !== token.userId) {
      throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to change this driver's status");
    }
  }
  if (!driver) {
    throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
  }

  if (!driver.approved) {
    throw new AppError(httpStatus.BAD_REQUEST, "User is not approved as a driver yet.");
  }

  if (updateStatus === DriverStatus.AVAILABLE) {
    const activeVehicle = vehicles.some(vehicle => vehicle.isActive === true);
    if (!activeVehicle) {
      throw new AppError(httpStatus.BAD_REQUEST, "Do not have any active vehicle. Please activate a vehicle first.");
    }
    if(!driver.location){
      throw new AppError(httpStatus.BAD_REQUEST, "Set location first to go available.");
    }
  }

  if (token.role === Role.DRIVER) {
    if (driver.status === DriverStatus.ON_TRIP) {
      throw new AppError(httpStatus.BAD_REQUEST, "You cannot change status while on trip");
    }

    if ((updateStatus !== DriverStatus.AVAILABLE) && (updateStatus !== DriverStatus.OFFLINE)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid status change request");
    }
    driver.status = updateStatus as DriverStatus;
    await driver.save();
  }

  if (token.role === Role.ADMIN) {
    if (!Object.values(DriverStatus).includes(updateStatus as DriverStatus)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid status change request");
    }

    driver.status = updateStatus as DriverStatus;
    await driver.save();
  }


  return driver;
}



export const DriverService = {
  createDriver,
  getAllDrivers,
  driverApprovedStatusChange,
  driverStatusChange
};