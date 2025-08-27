import AppError from "../../errorHelpers/AppError";
import { hashedPassword } from "../../utils/hashedPassword";
import { IAuthProvider, IsActive, IUser } from "./user.interface";
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

export const UserService = {
    createUser,
    getAllUsers,
    isActiveChange
}