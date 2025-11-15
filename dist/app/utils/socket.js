"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToDriverThatRideHasBeenCancelledOrTimeOut = exports.emitToDriverThatHeHasNewRideRequest = exports.emitToUser = exports.emitToRideRoom = exports.emitDriverLocationUpdate = exports.sendNotificationToUser = exports.emitStatusChange = exports.emitRideUpdate = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const socket_1 = require("../config/socket");
// Utility functions for socket emissions
const emitRideUpdate = (rideId, rideData) => {
    const io = (0, socket_1.getIO)();
    if (!io)
        return;
    const plain = JSON.parse(JSON.stringify(rideData));
    io.to(`ride_${rideId}`).emit('ride_update', Object.assign(Object.assign({}, plain), { timestamp: new Date() }));
};
exports.emitRideUpdate = emitRideUpdate;
const emitStatusChange = (rideId, status, updatedBy) => {
    const io = (0, socket_1.getIO)();
    if (!io)
        return;
    const plainStatus = JSON.parse(JSON.stringify(status));
    const plainUpdatedBy = JSON.parse(JSON.stringify(updatedBy));
    io.to(`ride_${rideId}`).emit('ride_status_change', {
        status: plainStatus,
        updatedBy: plainUpdatedBy,
        timestamp: new Date()
    });
};
exports.emitStatusChange = emitStatusChange;
const sendNotificationToUser = (userId, notification) => {
    const io = (0, socket_1.getIO)();
    if (!io)
        return;
    // You can implement user socket tracking here
    // For now, we'll emit to all connected clients and filter on client side
    io.emit('user_notification', Object.assign(Object.assign({ targetUserId: userId }, notification), { timestamp: new Date() }));
};
exports.sendNotificationToUser = sendNotificationToUser;
const emitDriverLocationUpdate = (rideId, location) => {
    const io = (0, socket_1.getIO)();
    if (!io)
        return;
    io.to(`ride_${rideId}`).emit('driver_location_update', {
        location,
        timestamp: new Date()
    });
};
exports.emitDriverLocationUpdate = emitDriverLocationUpdate;
const emitToRideRoom = (rideId, event, data) => {
    const io = (0, socket_1.getIO)();
    if (!io)
        return;
    io.to(`ride_${rideId}`).emit(event, Object.assign(Object.assign({}, data), { timestamp: new Date() }));
};
exports.emitToRideRoom = emitToRideRoom;
const emitToUser = (socketId, event, data) => {
    const io = (0, socket_1.getIO)();
    if (!io)
        return;
    io.to(socketId).emit(event, Object.assign(Object.assign({}, data), { timestamp: new Date() }));
};
exports.emitToUser = emitToUser;
const emitToDriverThatHeHasNewRideRequest = (driverUserId, rideData) => {
    const io = (0, socket_1.getIO)();
    if (!io)
        return;
    const connectedUsers = (0, socket_1.getConnectedUsers)();
    console.log("connected users", connectedUsers);
    const socketIds = [];
    connectedUsers.forEach((u, sid) => {
        if (u.userId === driverUserId && (!u.role || u.role === "DRIVER")) {
            socketIds.push(sid);
        }
    });
    console.log("driver sockets", socketIds);
    if (socketIds.length === 0)
        return;
    const plainRideData = JSON.parse(JSON.stringify(rideData));
    const payload = Object.assign(Object.assign({}, plainRideData), { timestamp: new Date() });
    const plainPayload = JSON.parse(JSON.stringify(payload));
    socketIds.forEach((sid) => io.to(sid).emit("new_ride_request", plainPayload));
};
exports.emitToDriverThatHeHasNewRideRequest = emitToDriverThatHeHasNewRideRequest;
const emitToDriverThatRideHasBeenCancelledOrTimeOut = (driverUserId, rideId) => {
    const io = (0, socket_1.getIO)();
    if (!io) {
        console.log("[emit] IO not initialized");
        return;
    }
    const connectedUsers = (0, socket_1.getConnectedUsers)();
    console.log("[emit] Connected users:", Array.from(connectedUsers.entries()).map(([sid, u]) => ({ sid, userId: u.userId, role: u.role })));
    const socketIds = [];
    connectedUsers.forEach((u, sid) => {
        if (u.userId === driverUserId && (!u.role || u.role === "DRIVER")) {
            socketIds.push(sid);
        }
    });
    console.log("[emit] Found socketIds:", socketIds, "for driverUserId:", driverUserId);
    if (socketIds.length === 0) {
        console.log("[emit] No sockets found for driver");
        return;
    }
    const payload = { rideId, timestamp: new Date().toISOString() };
    const plainPayload = JSON.parse(JSON.stringify(payload));
    socketIds.forEach((sid) => {
        console.log("[emit] Sending ride_cancelled to socket:", sid);
        io.to(sid).emit("ride_cancelled", plainPayload);
    });
};
exports.emitToDriverThatRideHasBeenCancelledOrTimeOut = emitToDriverThatRideHasBeenCancelledOrTimeOut;
