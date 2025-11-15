import express from 'express';
import cors from 'cors';
import https from 'http-status-codes';
import { Request, Response } from 'express';
import notFound from './app/middlewares/notFound';
import { globalErrorHandler } from './app/middlewares/globalErrorHandler';
import { router } from './app/routes';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import expressSession from 'express-session';
import { envVars } from './app/config/env';
import './app/config/passport'

const app = express()

// Trust Railway/Vercel proxy - MOVED BEFORE COOKIE PARSER
app.set('trust proxy', 1)

// Cookie parser should come before session
app.use(cookieParser())

app.use(expressSession({
    secret: envVars.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: envVars.NODE_ENV === 'production' ? true : false, 
        httpOnly: true,
        sameSite: envVars.NODE_ENV === 'production' ? 'none' : 'lax', // CHANGED: use envVars
        maxAge: 7 * 24 * 60 * 60 * 1000, // UNCOMMENTED: 24 hours
        domain: envVars.NODE_ENV === 'production' ? undefined : 'localhost' // ADDED: domain setting
    },
    proxy: envVars.NODE_ENV === 'production' // ADDED: trust proxy in production
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Enhanced CORS configuration
const allowedOrigins = [
    envVars.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://ride-booking-frontend-eta.vercel.app' // ADDED: explicit frontend URL
].filter(Boolean); // Remove undefined/null values

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('❌ Blocked by CORS:', origin); // ADDED: log blocked origins
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'], // ADDED: X-Requested-With
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 200,
    preflightContinue: false // ADDED: handle preflight properly
}))

app.use(passport.initialize())
app.use(passport.session())

app.use("/api/v1", router)

app.get('/', (req: Request, res: Response) => {
    res.status(https.OK).json({
        message: "Welcome to Ride Booking API"
    })
})

app.use(globalErrorHandler)
app.use(notFound)

export default app