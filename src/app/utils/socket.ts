/* eslint-disable @typescript-eslint/no-explicit-any */
import { getConnectedUsers, getIO } from '../config/socket';
import { IRide } from '../modules/ride/ride.interface';

// Utility functions for socket emissions
export const emitRideUpdate = (rideId: string, rideData: IRide) => {
  const io = getIO();
  if (!io) return;
 
  const plain = JSON.parse(JSON.stringify(rideData));
  io.to(`ride_${rideId}`).emit('ride_update', {
    ...plain,
    timestamp: new Date()
  });
};

export const emitStatusChange = (rideId: string, status: string, updatedBy: string) => {
  const io = getIO();
  if (!io) return;
  const plainStatus = JSON.parse(JSON.stringify(status));
  const plainUpdatedBy = JSON.parse(JSON.stringify(updatedBy));
  
  io.to(`ride_${rideId}`).emit('ride_status_change', {
    status: plainStatus,
    updatedBy: plainUpdatedBy,
    timestamp: new Date()
  });
};

export const sendNotificationToUser = (userId: string, notification: any) => {
  const io = getIO();
  if (!io) return;

  // You can implement user socket tracking here
  // For now, we'll emit to all connected clients and filter on client side
  io.emit('user_notification', {
    targetUserId: userId,
    ...notification,
    timestamp: new Date()
  });
};

export const emitDriverLocationUpdate = (rideId: string, location: [number, number]) => {
  const io = getIO();
  if (!io) return;

  io.to(`ride_${rideId}`).emit('driver_location_update', {
    location,
    timestamp: new Date()
  });
};

export const emitToRideRoom = (rideId: string, event: string, data: any) => {
  const io = getIO();
  if (!io) return;

  io.to(`ride_${rideId}`).emit(event, {
    ...data,
    timestamp: new Date()
  });
};

export const emitToUser = (socketId: string, event: string, data: any) => {
  const io = getIO();
  if (!io) return;

  io.to(socketId).emit(event, {
    ...data,
    timestamp: new Date()
  });
};


export const emitToDriverThatHeHasNewRideRequest = (driverUserId: string, rideData: IRide) => {
  const io = getIO();
  if (!io) return;

  const connectedUsers = getConnectedUsers();
  console.log("connected users", connectedUsers);
  const socketIds: string[] = [];
  connectedUsers.forEach((u, sid) => {
    if (u.userId === driverUserId && (!u.role || u.role === "DRIVER")) {
      socketIds.push(sid);
    }
  });
  console.log("driver sockets", socketIds)
  if (socketIds.length === 0) return;
const plainRideData = JSON.parse(JSON.stringify(rideData));
  const payload = { ...plainRideData, timestamp: new Date() };
  const plainPayload = JSON.parse(JSON.stringify(payload));
  socketIds.forEach((sid) => io.to(sid).emit("new_ride_request", plainPayload));
};

export const emitToDriverThatRideHasBeenCancelledOrTimeOut = (driverUserId: string, rideId: string) => {
  const io = getIO();
  if (!io) {
    console.log("[emit] IO not initialized");
    return;
  }

  const connectedUsers = getConnectedUsers();
  console.log("[emit] Connected users:", Array.from(connectedUsers.entries()).map(([sid, u]) => ({ sid, userId: u.userId, role: u.role })));

  const socketIds: string[] = [];
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


