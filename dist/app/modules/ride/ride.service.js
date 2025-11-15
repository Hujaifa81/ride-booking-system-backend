"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideService = void 0;
const ride_interface_1 = require("./ride.interface");
const ride_model_1 = require("./ride.model");
const fareCalculation_1 = require("../../utils/fareCalculation");
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const AppError_1 = __importDefault(require("../../errorHelpers/AppError"));
const rideStatusChange_1 = require("../../utils/rideStatusChange");
const vehicle_model_1 = require("../vehicle/vehicle.model");
const findNearestAvailableDriver_1 = require("../../utils/findNearestAvailableDriver");
const driver_model_1 = require("../driver/driver.model");
const driver_interface_1 = require("../driver/driver.interface");
const agenda_1 = require("../../agenda/agenda");
const user_model_1 = require("../user/user.model");
const user_interface_1 = require("../user/user.interface");
const queryBuilder_1 = require("../../utils/queryBuilder");
const createRide = (rideData, token) => __awaiter(void 0, void 0, void 0, function* () {
    const rides = yield ride_model_1.Ride.find({ user: token.userId, status: { $in: [ride_interface_1.RideStatus.ACCEPTED, ride_interface_1.RideStatus.IN_TRANSIT, ride_interface_1.RideStatus.GOING_TO_PICK_UP, ride_interface_1.RideStatus.DRIVER_ARRIVED, ride_interface_1.RideStatus.REQUESTED, ride_interface_1.RideStatus.PENDING] } });
    const user = yield user_model_1.User.findById(token.userId);
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
    const totalCancelledRidesToday = yield ride_model_1.Ride.countDocuments({
        user: token.userId,
        statusHistory: {
            $elemMatch: {
                status: ride_interface_1.RideStatus.CANCELLED_BY_RIDER,
                timestamp: { $gte: todayStart, $lt: todayEnd }
            }
        }
    });
    const maxCancellationsPerDay = 3;
    if (totalCancelledRidesToday >= maxCancellationsPerDay) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, `You have reached the maximum limit of ${maxCancellationsPerDay} cancelled rides for today. You cannot request a new ride until tomorrow.`);
    }
    if (rides.length > 0) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You have an ongoing ride. Please complete or cancel the current ride before requesting a new one.");
    }
    if (!(user === null || user === void 0 ? void 0 : user.phone)) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "Please add your phone number in profile before requesting a ride.");
    }
    if (rideData.pickupLocation && rideData.dropOffLocation) {
        if (rideData.pickupLocation.coordinates[0] === rideData.dropOffLocation.coordinates[0] && rideData.pickupLocation.coordinates[1] === rideData.dropOffLocation.coordinates[1]) {
            throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "Pickup and drop-off locations cannot be the same.");
        }
    }
    let approxFare = 0;
    if (rideData.pickupLocation && rideData.dropOffLocation) {
        approxFare = yield (0, fareCalculation_1.calculateApproxFareWithSurge)(rideData.pickupLocation, rideData.dropOffLocation);
    }
    rideData.approxFare = approxFare;
    const ride = yield ride_model_1.Ride.create(Object.assign(Object.assign({}, rideData), { user: token.userId, rejectedDrivers: [], statusHistory: [{
                status: ride_interface_1.RideStatus.REQUESTED,
                timestamp: new Date(),
                by: token.userId
            }] }));
    const driver = yield (0, findNearestAvailableDriver_1.findNearestAvailableDriver)(ride._id.toString());
    if (!driver) {
        ride.status = ride_interface_1.RideStatus.PENDING;
        yield ride.save();
        // Start repeating job to retry assignment every 30 sec
        yield agenda_1.agenda.every("30 seconds", "checkPendingRide", { rideId: ride._id.toString() });
        return ride;
    }
    const activeVehicle = yield vehicle_model_1.Vehicle.findOne({ user: driver.user, isActive: true });
    ride.vehicle = activeVehicle === null || activeVehicle === void 0 ? void 0 : activeVehicle._id;
    ride.driver = driver === null || driver === void 0 ? void 0 : driver._id;
    yield ride.save();
    // Schedule job to check driver response after 5 minute
    yield agenda_1.agenda.schedule("5 minutes", "driverResponseTimeout", { rideId: ride._id.toString(), driverId: driver._id.toString() });
    const rideWithDriverPopulated = yield ride_model_1.Ride.findById(ride._id).populate('driver').populate('user');
    return rideWithDriverPopulated;
});
const rideStatusChangeAfterRideAccepted = (rideId, status, token) => __awaiter(void 0, void 0, void 0, function* () {
    if (status === ride_interface_1.RideStatus.GOING_TO_PICK_UP) {
        const ride = yield (0, rideStatusChange_1.goingToPickup)(rideId, token);
        return ride;
    }
    if (status === ride_interface_1.RideStatus.DRIVER_ARRIVED) {
        const ride = yield (0, rideStatusChange_1.driverArrived)(rideId, token);
        return ride;
    }
    if (status === ride_interface_1.RideStatus.IN_TRANSIT) {
        const ride = yield (0, rideStatusChange_1.inTransitRide)(rideId, token);
        return ride;
    }
    if (status === ride_interface_1.RideStatus.REACHED_DESTINATION) {
        const ride = yield (0, rideStatusChange_1.reachedDestinationRide)(rideId, token);
        return ride;
    }
    if (status === ride_interface_1.RideStatus.COMPLETED) {
        const ride = yield (0, rideStatusChange_1.completedRide)(rideId, token);
        return ride;
    }
});
const canceledRide = (rideId, canceledReason, token) => __awaiter(void 0, void 0, void 0, function* () {
    const ride = (0, rideStatusChange_1.cancelRide)(rideId, canceledReason, token);
    return ride;
});
const getAllRides = () => __awaiter(void 0, void 0, void 0, function* () {
    const rides = yield ride_model_1.Ride.find().populate('driver').populate('user');
    const ridesWithVehicle = yield Promise.all(rides.map((ride) => __awaiter(void 0, void 0, void 0, function* () {
        const vehicle = yield vehicle_model_1.Vehicle.findById(ride.vehicle);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unused-vars
        const _a = vehicle.toObject(), { user, _id } = _a, vehicleData = __rest(_a, ["user", "_id"]);
        return Object.assign(Object.assign({}, ride.toObject()), { vehicle: vehicleData });
    })));
    return ridesWithVehicle;
});
const getRideHistory = (userId, token, query) => __awaiter(void 0, void 0, void 0, function* () {
    if (userId !== token.userId && token.role !== user_interface_1.Role.ADMIN) {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "You are not authorized to view this ride history");
    }
    // Resolve whose rides to fetch based on role
    let filter = {};
    if (token.role === user_interface_1.Role.RIDER) {
        filter = { user: userId };
    }
    else if (token.role === user_interface_1.Role.DRIVER) {
        const driver = yield driver_model_1.Driver.findOne({ user: userId });
        if (!driver) {
            throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You are not registered as a driver");
        }
        filter = {
            driver: driver._id
        };
    }
    else if (token.role === user_interface_1.Role.ADMIN) {
        const targetUser = yield user_model_1.User.findById(userId);
        if (!targetUser) {
            throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "User not found");
        }
        if (targetUser.role === user_interface_1.Role.RIDER) {
            filter = { user: userId };
        }
        else if (targetUser.role === user_interface_1.Role.DRIVER) {
            const driver = yield driver_model_1.Driver.findOne({ user: userId });
            if (!driver) {
                throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "This user is not registered as a driver");
            }
            filter = { driver: driver._id };
        }
        else {
            filter = { user: userId }; // default fallback
        }
    }
    // Build query with populations (avoid N+1 for vehicle)
    const baseQuery = ride_model_1.Ride.find(filter)
        .populate('driver')
        .populate('user')
        .populate({ path: 'vehicle', select: '-user' });
    const qb = new queryBuilder_1.QueryBuilder(baseQuery, query);
    const built = yield qb
        .dateBetweenSearch("createdAt")
        .filter()
        .sort()
        .paginate();
    const [data, meta] = yield Promise.all([built.build(), qb.getMeta()]);
    // Ensure vehicle is null-safe
    const ridesWithVehicle = data.map((ride) => {
        var _a;
        const obj = typeof ride.toObject === 'function' ? ride.toObject() : ride;
        return Object.assign(Object.assign({}, obj), { vehicle: (_a = obj.vehicle) !== null && _a !== void 0 ? _a : null });
    });
    return { meta, data: ridesWithVehicle };
});
const getSingleRideDetails = (rideId, token) => __awaiter(void 0, void 0, void 0, function* () {
    const ride = yield ride_model_1.Ride.findById(rideId).populate('driver').populate('user');
    if (!ride) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Ride not found");
    }
    if (ride.user._id.toString() !== token.userId &&
        token.role !== 'ADMIN' &&
        (ride.driver &&
            typeof ride.driver === 'object' &&
            'user' in ride.driver &&
            ride.driver.user.toString() !== token.userId)) {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "You are not authorized to view this ride details");
    }
    const rideWithVehicle = yield vehicle_model_1.Vehicle.findById(ride.vehicle);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unused-vars
    const _a = rideWithVehicle.toObject(), { user, _id } = _a, vehicleData = __rest(_a, ["user", "_id"]);
    return Object.assign(Object.assign({}, ride.toObject()), { vehicle: vehicleData });
});
const rejectRide = (rideId, token) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const ride = yield ride_model_1.Ride.findOne({ _id: rideId });
    const driver = yield driver_model_1.Driver.findOne({ user: token.userId });
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not found");
    }
    if (!ride) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Ride not found");
    }
    if (((_a = ride.driver) === null || _a === void 0 ? void 0 : _a.toString()) !== driver._id.toString()) {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "You are not authorized to reject this ride");
    }
    if (ride.user.toString() === token.userId) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You cannot reject your own ride request");
    }
    if (ride.status !== ride_interface_1.RideStatus.REQUESTED) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You can only reject a ride that is in requested status");
    }
    ride.rejectedDrivers.push(driver._id);
    ride.driver = null;
    ride.vehicle = null;
    yield ride.save();
    // Cancel any existing timeout job for this ride and driver
    yield agenda_1.agenda.cancel({ name: "driverResponseTimeout", "data.rideId": ride._id.toString(), "data.driverId": driver._id.toString() });
    const newDriver = yield (0, findNearestAvailableDriver_1.findNearestAvailableDriver)(ride._id.toString());
    if (newDriver) {
        ride.driver = newDriver._id;
        const activeVehicle = yield vehicle_model_1.Vehicle.findOne({ user: newDriver.user, isActive: true });
        ride.vehicle = activeVehicle === null || activeVehicle === void 0 ? void 0 : activeVehicle._id;
        yield ride.save();
        // Schedule new timeout job for the newly assigned driver
        yield agenda_1.agenda.schedule("5 minutes", "driverResponseTimeout", {
            rideId: ride._id.toString(),
            driverId: newDriver._id.toString(),
        });
        console.log("[job] Scheduled driverResponseTimeout in 5 minutes");
    }
    else {
        ride.status = ride_interface_1.RideStatus.PENDING;
        ride.statusHistory.push({
            status: ride_interface_1.RideStatus.PENDING,
            timestamp: new Date(),
            by: 'SYSTEM'
        });
        yield ride.save();
        // Start repeating job to retry assignment every 30 sec
        yield agenda_1.agenda.every("30 seconds", "checkPendingRide", { rideId: ride._id.toString() });
    }
    return ride;
});
const acceptRide = (rideId, token) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const ride = yield ride_model_1.Ride.findById(rideId);
    const driver = yield driver_model_1.Driver.findOne({ user: token.userId });
    if (!ride) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Ride not found");
    }
    if (((_a = ride.driver) === null || _a === void 0 ? void 0 : _a.toString()) !== (driver === null || driver === void 0 ? void 0 : driver._id.toString())) {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "You are not authorized to accept this ride");
    }
    if (ride.user.toString() === token.userId) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You cannot accept your own ride request");
    }
    if (ride.status !== ride_interface_1.RideStatus.REQUESTED) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You can only accept a ride that is in requested status");
    }
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not found");
    }
    if (driver.status !== driver_interface_1.DriverStatus.AVAILABLE) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You are not available to accept rides. Please set your status to AVAILABLE.");
    }
    if (driver.activeRide) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You already have an active ride. Please complete or cancel the current ride before accepting a new one.");
    }
    const activeVehicle = yield vehicle_model_1.Vehicle.findOne({ user: token.userId, isActive: true });
    ride.status = ride_interface_1.RideStatus.ACCEPTED;
    ride.statusHistory.push({
        status: ride_interface_1.RideStatus.ACCEPTED,
        timestamp: new Date(),
        by: token.userId
    });
    ride.vehicle = activeVehicle === null || activeVehicle === void 0 ? void 0 : activeVehicle._id;
    yield ride.save();
    if (driver) {
        driver.activeRide = ride._id;
        driver.status = driver_interface_1.DriverStatus.ON_TRIP;
        yield driver.save();
    }
    // Cancel any existing timeout job for this ride and driver
    yield agenda_1.agenda.cancel({ name: "driverResponseTimeout", "data.rideId": ride._id.toString(), "data.driverId": token.userId });
    yield agenda_1.agenda.cancel({ name: "checkPendingRide", "data.rideId": ride._id.toString() });
    const updatedRide = yield ride_model_1.Ride.findById(rideId)
        .populate('user')
        .populate('driver')
        .populate('vehicle')
        .lean();
    return updatedRide;
});
const createFeedback = (rideId, feedback, token) => __awaiter(void 0, void 0, void 0, function* () {
    const ride = yield ride_model_1.Ride.findById(rideId);
    if (!ride) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Ride not found");
    }
    if (ride.user.toString() !== token.userId) {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "You are not authorized to add feedback to this ride");
    }
    if (ride.status !== ride_interface_1.RideStatus.COMPLETED) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You can only add feedback to a completed ride");
    }
    ride.feedback = feedback;
    yield ride.save();
    return ride;
});
const getActiveRide = (token) => __awaiter(void 0, void 0, void 0, function* () {
    let ride = null;
    if (token.role === user_interface_1.Role.RIDER) {
        ride = yield ride_model_1.Ride.findOne({
            user: token.userId,
            status: {
                $in: [
                    ride_interface_1.RideStatus.REQUESTED,
                    ride_interface_1.RideStatus.ACCEPTED,
                    ride_interface_1.RideStatus.DRIVER_ARRIVED,
                    ride_interface_1.RideStatus.GOING_TO_PICK_UP,
                    ride_interface_1.RideStatus.IN_TRANSIT,
                    ride_interface_1.RideStatus.REACHED_DESTINATION,
                    ride_interface_1.RideStatus.PENDING
                ]
            }
        }).populate('driver').populate('user');
    }
    if (token.role === user_interface_1.Role.DRIVER) {
        const driver = yield driver_model_1.Driver.findOne({ user: token.userId });
        if (!driver) {
            throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not found");
        }
        ride = yield ride_model_1.Ride.findOne({
            driver: driver._id,
            status: {
                $in: [
                    ride_interface_1.RideStatus.ACCEPTED,
                    ride_interface_1.RideStatus.DRIVER_ARRIVED,
                    ride_interface_1.RideStatus.GOING_TO_PICK_UP,
                    ride_interface_1.RideStatus.IN_TRANSIT,
                    ride_interface_1.RideStatus.REACHED_DESTINATION,
                ]
            }
        }).populate('driver').populate('user');
    }
    if (!ride) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "No active ride found");
    }
    //  Handle vehicle data safely
    let vehicleData = null;
    try {
        if (ride.vehicle) {
            const vehicle = yield vehicle_model_1.Vehicle.findById(ride.vehicle);
            if (vehicle) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const _a = vehicle.toObject(), { user, _id } = _a, vehicleInfo = __rest(_a, ["user", "_id"]);
                vehicleData = vehicleInfo;
            }
        }
    }
    catch (error) {
        console.error('Error fetching vehicle data:', error);
        // Continue without vehicle data rather than failing
    }
    return Object.assign(Object.assign({}, ride.toObject()), { vehicle: vehicleData // Will be null if no vehicle or vehicle not found
     });
});
const getApproximateFare = (pickupLocation, dropOffLocation) => __awaiter(void 0, void 0, void 0, function* () {
    const fare = yield (0, fareCalculation_1.calculateApproxFareWithSurge)(pickupLocation, dropOffLocation);
    return fare;
});
const getTotalRidesCount = (userId, token) => __awaiter(void 0, void 0, void 0, function* () {
    if (userId !== token.userId && token.role !== user_interface_1.Role.ADMIN) {
        throw new AppError_1.default(http_status_codes_1.default.UNAUTHORIZED, "You are not authorized to view this ride count");
    }
    if (token.role === user_interface_1.Role.RIDER) {
        const totalRides = yield ride_model_1.Ride.countDocuments({ user: userId, status: ride_interface_1.RideStatus.COMPLETED });
        const cancelledRides = yield ride_model_1.Ride.countDocuments({ user: userId, status: { $in: [ride_interface_1.RideStatus.CANCELLED_BY_RIDER, ride_interface_1.RideStatus.CANCELLED_BY_DRIVER, ride_interface_1.RideStatus.CANCELLED_BY_ADMIN, ride_interface_1.RideStatus.CANCELLED_FOR_PENDING_TIME_OVER] } });
        return { totalRides, cancelledRides };
    }
    else if (token.role === user_interface_1.Role.DRIVER) {
        const driver = yield driver_model_1.Driver.findOne({ user: userId });
        if (!driver) {
            throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You are not registered as a driver");
        }
        const totalRides = yield ride_model_1.Ride.countDocuments({ driver: driver._id, status: ride_interface_1.RideStatus.COMPLETED });
        const cancelledRides = yield ride_model_1.Ride.countDocuments({ driver: driver._id, status: { $in: [ride_interface_1.RideStatus.CANCELLED_BY_RIDER, ride_interface_1.RideStatus.CANCELLED_BY_DRIVER, ride_interface_1.RideStatus.CANCELLED_BY_ADMIN, ride_interface_1.RideStatus.CANCELLED_FOR_PENDING_TIME_OVER] } });
        return { totalRides, cancelledRides };
    }
    throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "Invalid user role for ride count");
});
const getIncomingRideRequests = (token) => __awaiter(void 0, void 0, void 0, function* () {
    const driver = yield driver_model_1.Driver.findOne({ user: token.userId });
    if (!driver) {
        throw new AppError_1.default(http_status_codes_1.default.NOT_FOUND, "Driver not found");
    }
    if (driver.status === driver_interface_1.DriverStatus.ON_TRIP && driver.activeRide) {
        throw new AppError_1.default(http_status_codes_1.default.BAD_REQUEST, "You have an active ride. Please complete or cancel the current ride before fetching active ride.");
    }
    const incomingRides = yield ride_model_1.Ride.find({
        driver: driver._id,
        status: ride_interface_1.RideStatus.REQUESTED
    }).populate('user').populate('vehicle');
    return incomingRides;
});
exports.RideService = {
    createRide,
    rideStatusChangeAfterRideAccepted,
    canceledRide,
    getRideHistory,
    getSingleRideDetails,
    getAllRides,
    rejectRide,
    acceptRide,
    createFeedback,
    getActiveRide,
    getApproximateFare,
    getTotalRidesCount,
    getIncomingRideRequests
};
