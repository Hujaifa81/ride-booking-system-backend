import { JwtPayload } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { hashedPassword } from "../../utils/hashedPassword";
import { Driver } from "../driver/driver.model";
import { IAuthProvider, IUser, Role } from "./user.interface";
import { User } from "./user.model";
import httpStatus from "http-status-codes";

const createUser = async (payload: Partial<IUser>) => {
    const { email, password, ...rest } = payload;

    const isUserExist = await User.findOne({ email });

    if (isUserExist) {
        throw new AppError(httpStatus.BAD_REQUEST, "User already exists with this email");
    }

    const afterHashedPassword = await hashedPassword(password as string);

    const authProvider: IAuthProvider = {
        provider: 'credentials',
        providerId: email as string
    }

    const user = await User.create({
        email,
        password: afterHashedPassword,
        auths: [authProvider],
        ...rest
    })
    return user;
}

const getAllUsers = async () => {
    const users = await User.find().select('-password').lean();

    return users;
}


const updateUser = async (userId: string, payload: Partial<IUser>, decodedToken: JwtPayload) => {

    if (decodedToken.role === Role.RIDER || decodedToken.role === Role.DRIVER) {
        if (userId !== decodedToken.userId) {
            throw new AppError(401, "You are not authorized")
        }
    }

    const isUserExist = await User.findById(userId);

    if (!isUserExist) {
        throw new AppError(httpStatus.NOT_FOUND, "User Not Found")
    }

    if (payload.role) {
        if (decodedToken.role === Role.RIDER || decodedToken.role === Role.DRIVER) {
            throw new AppError(httpStatus.FORBIDDEN, "You are not authorized");
        }

        if (isUserExist.role === payload.role) {
            throw new AppError(httpStatus.BAD_REQUEST, `User role is already ${payload.role}`);
        }

        if (payload.role === Role.DRIVER) {
            const driver = await Driver.findOne({ user: userId });
            if (!driver) {
                throw new AppError(httpStatus.BAD_REQUEST, "This user is not in a drivers collection.Need to create a driver first.");
            }
            driver.approved = true
            await driver.save();
        }

    }

    if (payload.isActive || payload.isDeleted || payload.isVerified) {
        if (decodedToken.role === Role.RIDER || decodedToken.role === Role.DRIVER) {
            throw new AppError(httpStatus.FORBIDDEN, "You are not authorized");
        }
    }

     const newUpdatedUser = await User.findByIdAndUpdate(userId, payload, { new: true, runValidators: true })

    return newUpdatedUser


}

export const UserService = {
    createUser,
    getAllUsers,
    updateUser,
}