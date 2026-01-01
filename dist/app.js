"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const notFound_1 = __importDefault(require("./app/middlewares/notFound"));
const globalErrorHandler_1 = require("./app/middlewares/globalErrorHandler");
const routes_1 = require("./app/routes");
const passport_1 = __importDefault(require("passport"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const env_1 = require("./app/config/env");
require("./app/config/passport");
const app = (0, express_1.default)();
// Trust Railway/Vercel proxy - MOVED BEFORE COOKIE PARSER
app.set('trust proxy', 1);
// Cookie parser should come before session
app.use((0, cookie_parser_1.default)());
app.use((0, express_session_1.default)({
    secret: env_1.envVars.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: env_1.envVars.NODE_ENV === 'production' ? true : false,
        httpOnly: true,
        sameSite: env_1.envVars.NODE_ENV === 'production' ? 'none' : 'lax', // CHANGED: use envVars
        maxAge: 7 * 24 * 60 * 60 * 1000, // UNCOMMENTED: 24 hours
        domain: env_1.envVars.NODE_ENV === 'production' ? undefined : 'localhost' // ADDED: domain setting
    },
    proxy: env_1.envVars.NODE_ENV === 'production' // ADDED: trust proxy in production
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Enhanced CORS configuration
const allowedOrigins = [
    env_1.envVars.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://ride-booking-frontend-eta.vercel.app' // ADDED: explicit frontend URL
].filter(Boolean); // Remove undefined/null values
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
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
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
app.use("/api/v1", routes_1.router);
app.get('/', (req, res) => {
    res.status(http_status_codes_1.default.OK).json({
        message: "Welcome to Ride Booking API"
    });
});
app.use(globalErrorHandler_1.globalErrorHandler);
app.use(notFound_1.default);
exports.default = app;
