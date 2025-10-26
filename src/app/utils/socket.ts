/* eslint-disable @typescript-eslint/no-explicit-any */
import { getIO } from '../config/socket';
import { IRide } from '../modules/ride/ride.interface';

// Utility functions for socket emissions
export const emitRideUpdate = (rideId: string, rideData:IRide) => {
  const io = getIO();
  if (!io) return;
  
  io.to(`ride_${rideId}`).emit('ride_update', {
    ...rideData,
    timestamp: new Date()
  });
};

export const emitStatusChange = (rideId: string, status: string, updatedBy: string) => {
  const io = getIO();
  if (!io) return;
  
  io.to(`ride_${rideId}`).emit('ride_status_change', {
    status,
    updatedBy,
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
