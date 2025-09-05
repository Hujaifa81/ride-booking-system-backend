"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideStatus = void 0;
var RideStatus;
(function (RideStatus) {
    RideStatus["REQUESTED"] = "REQUESTED";
    RideStatus["PENDING"] = "PENDING";
    RideStatus["ACCEPTED"] = "ACCEPTED";
    RideStatus["GOING_TO_PICK_UP"] = "GOING_TO_PICK_UP";
    RideStatus["DRIVER_ARRIVED"] = "DRIVER_ARRIVED";
    RideStatus["IN_TRANSIT"] = "IN_TRANSIT";
    RideStatus["REACHED_DESTINATION"] = "REACHED_DESTINATION";
    RideStatus["COMPLETED"] = "COMPLETED";
    RideStatus["CANCELLED_BY_RIDER"] = "CANCELLED_BY_RIDER";
    RideStatus["CANCELLED_BY_DRIVER"] = "CANCELLED_BY_DRIVER";
    RideStatus["CANCELLED_BY_ADMIN"] = "CANCELLED_BY_ADMIN";
    RideStatus["CANCELLED_FOR_PENDING_TIME_OVER"] = "CANCELLED_FOR_PENDING_TIME_OVER";
})(RideStatus || (exports.RideStatus = RideStatus = {}));
