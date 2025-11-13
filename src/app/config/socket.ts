import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { envVars } from './env';
import * as cookie from 'cookie';
import AppError from '../errorHelpers/AppError';


export interface SocketUser {
    userId: string;
    role: string;
    socketId: string;
}

let io: Server;
const connectedUsers = new Map<string, SocketUser>();
const rideRooms = new Map<string, Set<string>>();

export const initializeSocket = (server: HTTPServer) => {
    io = new Server(server, {
        cors: {
            origin: envVars.FRONTEND_URL || "http://localhost:3000",
            methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
            credentials: true
        }
    });

    // ✅ Fixed Authentication middleware
    io.use(async (socket, next) => {
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
                        } else {
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
                } catch (cookieError) {
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
            let decoded: JwtPayload;
            try {
                decoded = jwt.verify(token, envVars.JWT_ACCESS_SECRET) as JwtPayload;
            } catch (jwtError) {
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
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new AppError(401, 'Authentication error'));
        }
    });

    // Socket connection handlers
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.data.user.userId}`);

        connectedUsers.set(socket.id, {
            userId: socket.data.user.userId,
            role: socket.data.user.role,
            socketId: socket.id
        });

        socket.on('join_ride_room', ({ rideId }) => {
            socket.join(`ride_${rideId}`);

            if (!rideRooms.has(rideId)) {
                rideRooms.set(rideId, new Set());
            }
            rideRooms.get(rideId)?.add(socket.id);

            console.log(`User ${socket.data.user.userId} joined ride room: ${rideId}`);
        });

        socket.on('leave_ride_room', ({ rideId }) => {
            socket.leave(`ride_${rideId}`);
            rideRooms.get(rideId)?.delete(socket.id);
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

// Getter function for IO instance
export const getIO = () => io;

// Getter functions for connection tracking
export const getConnectedUsers = () => connectedUsers;
export const getRideRooms = () => rideRooms;