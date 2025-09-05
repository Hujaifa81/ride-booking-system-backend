"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kmCalculation = void 0;
const kmCalculation = (pickupLocation, dropOffLocation) => {
    const [lng1, lat1] = pickupLocation.coordinates;
    const [lng2, lat2] = dropOffLocation.coordinates;
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
exports.kmCalculation = kmCalculation;
