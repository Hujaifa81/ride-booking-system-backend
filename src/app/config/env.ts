import dotenv from "dotenv";
dotenv.config()

interface EnvConfig{
    PORT:string,
    DB_URL:string,
}

const loadEnv=():EnvConfig=>{
    const requiredEnvVars:string[] = ['PORT', 'DB_URL'];

    requiredEnvVars.forEach((key)=>{
        if(!process.env[key]){
            throw new Error(`Environment variable ${key} is not defined`);
        }
    })
    return {
        PORT: process.env.PORT as string,
        DB_URL: process.env.DB_URL as string,
    }
}
export const envVars= loadEnv();