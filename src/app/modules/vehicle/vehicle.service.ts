import { JwtPayload } from "jsonwebtoken";
import { IVehicle } from "./vehicle.interface";
import { Vehicle } from "./vehicle.model";
import httpStatus from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { User } from "../user/user.model";





const createVehicle=async(payload:Partial<IVehicle>, token: JwtPayload) => {
    
    const isVehicleExist = await Vehicle.findOne({ licensePlate: payload.licensePlate });
    
    
    if (isVehicleExist) {
        throw new AppError(httpStatus.BAD_REQUEST, "Vehicle already exists for this license plate");
    }
    const isUserExist = await User.findOne({ _id: token.userId });

    if (!isUserExist) {
        throw new AppError(httpStatus.BAD_REQUEST, "User is not created. Please create a user first.");
    }

    
    if(isUserExist.isVerified===false){ 
        throw new AppError(httpStatus.BAD_REQUEST, "You are not verified yet. Please verify your account first.");
    }   

    const vehicle = await Vehicle.create({
        ...payload,
        user:token.userId,
    });

    return vehicle;
}

const getMyVehicles=async(token: JwtPayload)=>{
    const vehicles=await Vehicle.find({user:token.userId, isDeleted:false});
    return vehicles;
}

const activeVehicleStatusChange=async(vehicleId:string, token: JwtPayload)=>{
    const vehicle=await Vehicle.findOne({_id:vehicleId, user:token.userId});

    if(!vehicle){
        throw new AppError(httpStatus.NOT_FOUND, "Vehicle not found");
    }
    vehicle.isActive = !vehicle.isActive;
    await vehicle.save();

    return vehicle;
}

export const VehicleService = {
    createVehicle,
    getMyVehicles,
    activeVehicleStatusChange
};