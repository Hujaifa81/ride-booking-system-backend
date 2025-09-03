import AppError from "../../errorHelpers/AppError";
import { hashedPassword } from "../../utils/hashedPassword";
import { Driver } from "../driver/driver.model";
import { IAuthProvider, IsActive, IUser, Role } from "./user.interface";
import { User } from "./user.model";
import httpStatus from "http-status-codes";

const createUser=async(payload:Partial<IUser>)=>{
    const {email,password,...rest}=payload;

    const isUserExist=await User.findOne({email});

    if(isUserExist){
        throw new AppError(httpStatus.BAD_REQUEST, "User already exists with this email");
    }

    const afterHashedPassword=await hashedPassword(password as string);

    const authProvider:IAuthProvider={
        provider:'credentials',
        providerId: email as string
    }

    const user=await User.create({
        email,
        password: afterHashedPassword,
        auths: [authProvider],
        ...rest
    })
    return user;
}

const getAllUsers=async()=>{
    const users=await User.find().select('-password').lean();
    
    return users;
}

const isActiveChange=async(userId:string,status:IsActive)=>{
    const user=await User.findById(userId);

    if(!user){
        throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }

    if(user.isActive===status){
        throw new AppError(httpStatus.BAD_REQUEST, `User is already ${status}`);
    }
    

    user.isActive=status;
    await user.save();

    return user;
}
const updateUserRole=async(userId:string,role:Role)=>{
    const user=await User.findById(userId);
    const driver=await Driver.findOne({user:userId});

    if(!user){
        throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }
    if(user.role===role){
        throw new AppError(httpStatus.BAD_REQUEST, `User role is already ${role}`);
    }
    
    if(role===Role.DRIVER){
        if(!driver){
            throw new AppError(httpStatus.BAD_REQUEST, "This user is not in a drivers collection.Need to create a driver first.");
        }
        driver.approved=true
        await driver.save();
    }
    user.role=role;
    await user.save();
    return user;
}

export const UserService = {
    createUser,
    getAllUsers,
    isActiveChange,
    updateUserRole
}