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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const env_1 = require("./app/config/env");
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("./app"));
const seedAdmin_1 = require("./app/utils/seedAdmin");
const agenda_1 = require("./app/agenda/agenda");
require("./app/agenda/jobs/ride.job");
const socket_1 = require("./app/config/socket");
let server;
function connectDB() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield mongoose_1.default.connect(env_1.envVars.DB_URL);
            console.log("✅ Connected to DB!!");
        }
        catch (error) {
            console.error("❌ DB connection error:", error);
            throw error;
        }
    });
}
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield connectDB();
        const httpServer = (0, http_1.createServer)(app_1.default);
        (0, socket_1.initializeSocket)(httpServer);
        const port = env_1.envVars.PORT || 5000;
        server = httpServer.listen(port, () => {
            console.log(`🚀 Server is listening on port ${port}`);
        });
        // Start agenda for background jobs
        yield agenda_1.agenda.start();
        console.log('✅ Agenda started');
        // Seed admin (only in development or first run)
        if (process.env.NODE_ENV !== 'production') {
            yield (0, seedAdmin_1.seedAdmin)();
        }
    }
    catch (error) {
        console.error("❌ Server startup error:", error);
        throw error;
    }
});
startServer();
// Graceful shutdown handlers
process.on("SIGTERM", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("⏳ SIGTERM signal received... Server shutting down..");
    yield agenda_1.agenda.stop();
    if (server) {
        server.close(() => {
            mongoose_1.default.connection.close();
            process.exit(0);
        });
    }
}));
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("⏳ SIGINT signal received... Server shutting down..");
    yield agenda_1.agenda.stop();
    if (server) {
        server.close(() => {
            mongoose_1.default.connection.close();
            process.exit(0);
        });
    }
}));
process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Rejection detected... Server shutting down..", err);
    if (server) {
        server.close(() => {
            process.exit(1);
        });
    }
    process.exit(1);
});
process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception detected... Server shutting down..", err);
    if (server) {
        server.close(() => {
            process.exit(1);
        });
    }
    process.exit(1);
});
exports.default = app_1.default;
