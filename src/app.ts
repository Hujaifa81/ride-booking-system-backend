import express from 'express';
import cors from 'cors';
import  https  from 'http-status-codes';
import { Request, Response } from 'express';
import notFound from './app/middlewares/notFound';
import { globalErrorHandler } from './app/middlewares/globalErrorHandler';
import { router } from './app/routes';

const app=express()
app.use(express.json())
app.use(cors())

app.use("/api/v1", router)

app.get('/',(req:Request,res:Response)=>{
    res.status(https.OK).json({
        message: "Welcome to Ride Booking API"
    })
})

app.use(globalErrorHandler)
app.use(notFound)

export default app