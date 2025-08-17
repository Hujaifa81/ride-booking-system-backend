import dotenv from "dotenv";
dotenv.config()

interface EnvConfig{
    PORT:string,
    DB_URL:string,
    NODE_ENV:string,
    SALT_ROUND:string
}

const loadEnv=():EnvConfig=>{
    const requiredEnvVars:string[] = ['PORT', 'DB_URL', 'NODE_ENV', 'SALT_ROUND'];

    requiredEnvVars.forEach((key)=>{
        if(!process.env[key]){
            throw new Error(`Environment variable ${key} is not defined`);
        }
    })
    return {
        PORT: process.env.PORT as string,
        DB_URL: process.env.DB_URL as string,
        NODE_ENV: process.env.NODE_ENV as string,
        SALT_ROUND: process.env.SALT_ROUND as string
    }
}
export const envVars= loadEnv();