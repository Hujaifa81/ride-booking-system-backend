import AppError from "../../errorHelpers/AppError";
import { hashedPassword } from "../../utils/hashedPassword";
import { IAuthProvider, IUser } from "./user.interface";
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

export const UserService = {
    createUser
}