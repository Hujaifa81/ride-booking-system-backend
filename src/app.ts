import express from 'express';
import cors from 'cors';
import  https  from 'http-status-codes';
import { Request, Response } from 'express';
import notFound from './app/middlewares/notFound';
import { globalErrorHandler } from './app/middlewares/globalErrorHandler';
import { router } from './app/routes';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import expressSession from 'express-session';
import { envVars } from './app/config/env';
import './app/config/passport'

const app=express()
app.use(expressSession({
    secret: envVars.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(express.json())
app.use(cors())
app.use(passport.initialize())
app.use(passport.session())
app.use(cookieParser())

app.use("/api/v1", router)

app.get('/',(req:Request,res:Response)=>{
    res.status(https.OK).json({
        message: "Welcome to Ride Booking API"
    })
})

app.use(globalErrorHandler)
app.use(notFound)

export default app