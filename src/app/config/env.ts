import dotenv from "dotenv";
dotenv.config()

interface EnvConfig{
    PORT:string,
    DB_URL:string,
    NODE_ENV:string,
    SALT_ROUND:string,
    GOOGLE_CLIENT_ID:string,
    GOOGLE_CLIENT_SECRET:string,
    EXPRESS_SESSION_SECRET:string,
    FRONTEND_URL:string,
    GOOGLE_CALLBACK_URL:string,
    JWT_ACCESS_SECRET:string,
    JWT_REFRESH_SECRET:string,
    JWT_ACCESS_EXPIRES_IN:string,
    JWT_REFRESH_EXPIRES_IN:string,
    
}

const loadEnv=():EnvConfig=>{
    const requiredEnvVars:string[] = ['PORT', 'DB_URL', 'NODE_ENV', 'SALT_ROUND',"EXPRESS_SESSION_SECRET", 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET','FRONTEND_URL','GOOGLE_CALLBACK_URL','JWT_ACCESS_SECRET','JWT_REFRESH_SECRET','JWT_ACCESS_EXPIRES_IN','JWT_REFRESH_EXPIRES_IN'];

    requiredEnvVars.forEach((key)=>{
        if(!process.env[key]){
            throw new Error(`Environment variable ${key} is not defined`);
        }
    })
    return {
        PORT: process.env.PORT as string,
        DB_URL: process.env.DB_URL as string,
        NODE_ENV: process.env.NODE_ENV as string,
        SALT_ROUND: process.env.SALT_ROUND as string,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID as string,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET as string,
        EXPRESS_SESSION_SECRET: process.env.EXPRESS_SESSION_SECRET as string,
        FRONTEND_URL: process.env.FRONTEND_URL as string,
        GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL as string,
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET as string,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
        JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN as string,
        JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN as string,
        
    }
}
export const envVars= loadEnv();