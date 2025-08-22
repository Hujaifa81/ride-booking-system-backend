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

const activeVehicle=async(vehicleId:string, token: JwtPayload)=>{
    const vehicle=await Vehicle.findOne({_id:vehicleId,user:token.userId});
    

    if(!vehicle){
        throw new AppError(httpStatus.NOT_FOUND, "Vehicle not found");
    }
    if(vehicle.isDeleted){
        throw new AppError(httpStatus.BAD_REQUEST, "Vehicle is deleted");
    }
    if(vehicle.isActive){
        throw new AppError(httpStatus.BAD_REQUEST, "Vehicle is already active");
    }
    
    vehicle.isActive=true;
    await vehicle.save();

    const otherVehicles=await Vehicle.find({user:token.userId, _id:{$ne:vehicleId}});

    for(const otherVehicle of otherVehicles){
        otherVehicle.isActive=false;
        await otherVehicle.save();
    }

    return vehicle;
}

export const VehicleService = {
    createVehicle,
    activeVehicle
};