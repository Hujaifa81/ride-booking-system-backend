"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRideRooms = exports.getConnectedUsers = exports.getIO = exports.initializeSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("./env");
const cookie = __importStar(require("cookie"));
const AppError_1 = __importDefault(require("../errorHelpers/AppError"));
let io;
const connectedUsers = new Map();
const rideRooms = new Map();
const initializeSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: env_1.envVars.FRONTEND_URL || "http://localhost:3000",
            methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
            credentials: true
        }
    });
    // ✅ Fixed Authentication middleware
    io.use((socket, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            let token;
            const headers = socket.handshake.headers;
            const auth = socket.handshake.auth;
            console.log('Socket auth attempt:', {
                hasAuthToken: !!auth.token,
                hasAuthHeader: !!headers.authorization,
                hasCookie: !!headers.cookie,
                userAgent: headers['user-agent']
            });
            // Method 1: Check auth object
            if (auth.token) {
                token = auth.token;
                console.log('Token found in auth object');
            }
            // Method 2: Check authorization header
            if (!token && headers.authorization) {
                const authHeader = headers.authorization;
                if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
                    token = authHeader.replace('Bearer ', '');
                    console.log('Token found in authorization header');
                }
            }
            // Method 3: Check cookies with proper error handling
            if (!token && headers.cookie) {
                try {
                    if (typeof headers.cookie === 'string') {
                        console.log('Raw cookie header:', headers.cookie);
                        // ✅ Fix: Check if cookie.parse exists
                        if (cookie && typeof cookie.parse === 'function') {
                            const cookies = cookie.parse(headers.cookie);
                            console.log('Parsed cookies:', cookies);
                            token = cookies.accessToken;
                            if (token) {
                                console.log('Token found in cookies');
                            }
                        }
                        else {
                            console.error('Cookie.parse is not available');
                            // Manual cookie parsing as fallback
                            const cookieString = headers.cookie;
                            const cookiePairs = cookieString.split(';');
                            for (const pair of cookiePairs) {
                                const [key, value] = pair.trim().split('=');
                                if (key === 'accessToken') {
                                    token = value;
                                    console.log('Token found via manual parsing');
                                    break;
                                }
                            }
                        }
                    }
                }
                catch (cookieError) {
                    console.error('Cookie parsing error:', cookieError);
                    // Continue to next method instead of failing
                }
            }
            // Validate token exists
            if (!token) {
                console.log('Authentication failed: No token provided');
                return next(new Error('Authentication error: No token provided'));
            }
            // Verify JWT token
            let decoded;
            try {
                decoded = jsonwebtoken_1.default.verify(token, env_1.envVars.JWT_ACCESS_SECRET);
            }
            catch (jwtError) {
                console.error('JWT verification failed:', jwtError);
                return next(new Error('Authentication error: Invalid token'));
            }
            // Validate token payload
            if (!decoded.userId || !decoded.role) {
                console.error('Invalid token payload:', decoded);
                return next(new Error('Authentication error: Invalid token payload'));
            }
            // Store user data
            socket.data.user = decoded;
            console.log('User authenticated successfully:', {
                userId: decoded.userId,
                role: decoded.role
            });
            next();
        }
        catch (error) {
            console.error('Socket authentication error:', error);
            next(new AppError_1.default(401, 'Authentication error'));
        }
    }));
    // Socket connection handlers
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.data.user.userId}`);
        connectedUsers.set(socket.id, {
            userId: socket.data.user.userId,
            role: socket.data.user.role,
            socketId: socket.id
        });
        socket.on('join_ride_room', ({ rideId }) => {
            var _a;
            socket.join(`ride_${rideId}`);
            if (!rideRooms.has(rideId)) {
                rideRooms.set(rideId, new Set());
            }
            (_a = rideRooms.get(rideId)) === null || _a === void 0 ? void 0 : _a.add(socket.id);
            console.log(`User ${socket.data.user.userId} joined ride room: ${rideId}`);
        });
        socket.on('leave_ride_room', ({ rideId }) => {
            var _a;
            socket.leave(`ride_${rideId}`);
            (_a = rideRooms.get(rideId)) === null || _a === void 0 ? void 0 : _a.delete(socket.id);
            console.log(`User ${socket.data.user.userId} left ride room: ${rideId}`);
        });
        socket.on('driver_location_update', ({ rideId, location }) => {
            if (socket.data.user.role === 'DRIVER') {
                io.to(`ride_${rideId}`).emit('driver_location_update', {
                    location,
                    timestamp: new Date()
                });
            }
        });
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.data.user.userId}`);
            connectedUsers.delete(socket.id);
            rideRooms.forEach((socketIds, rideId) => {
                socketIds.delete(socket.id);
                if (socketIds.size === 0) {
                    rideRooms.delete(rideId);
                    console.log(`Deleted empty ride room: ${rideId}`);
                }
            });
        });
    });
    return io;
};
exports.initializeSocket = initializeSocket;
// Getter function for IO instance
const getIO = () => io;
exports.getIO = getIO;
// Getter functions for connection tracking
const getConnectedUsers = () => connectedUsers;
exports.getConnectedUsers = getConnectedUsers;
const getRideRooms = () => rideRooms;
exports.getRideRooms = getRideRooms;
