import bcryptjs from 'bcryptjs';
import { envVars } from '../config/env';

export const hashedPassword = async(password: string) => {
    const hashedPassword=await bcryptjs.hash(password,Number(envVars.SALT_ROUND));
    return hashedPassword;
}
export const comparePassword = async(password: string, hashedPassword: string) => {
    const isMatch = await bcryptjs.compare(password, hashedPassword);
    return isMatch;
}