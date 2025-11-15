import { Server, createServer } from 'http';
import { envVars } from './app/config/env';
import mongoose from 'mongoose';
import app from './app';
import { seedAdmin } from './app/utils/seedAdmin';
import { agenda } from './app/agenda/agenda';
import './app/agenda/jobs/ride.job';
import { initializeSocket } from './app/config/socket';

let server: Server;

async function connectDB() {
    try {
        await mongoose.connect(envVars.DB_URL);
        console.log("✅ Connected to DB!!");
    } catch (error) {
        console.error("❌ DB connection error:", error);
        throw error;
    }
}

const startServer = async () => {
    try {
        await connectDB();

        const httpServer = createServer(app);
        initializeSocket(httpServer);

        const port = envVars.PORT || 5000;
        server = httpServer.listen(port, () => {
            console.log(`🚀 Server is listening on port ${port}`);
        });

        // Start agenda for background jobs
        await agenda.start();
        console.log('✅ Agenda started');

        // Seed admin (only in development or first run)
        if (process.env.NODE_ENV !== 'production') {
            await seedAdmin();
        }
    } catch (error) {
        console.error("❌ Server startup error:", error);
        throw error;
    }
}

startServer();

// Graceful shutdown handlers
process.on("SIGTERM", async () => {
    console.log("⏳ SIGTERM signal received... Server shutting down..");
    await agenda.stop();
    if (server) {
        server.close(() => {
            mongoose.connection.close();
            process.exit(0);
        });
    }
})

process.on("SIGINT", async () => {
    console.log("⏳ SIGINT signal received... Server shutting down..");
    await agenda.stop();
    if (server) {
        server.close(() => {
            mongoose.connection.close();
            process.exit(0);
        });
    }
})

process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Rejection detected... Server shutting down..", err);
    if (server) {
        server.close(() => {
            process.exit(1);
        });
    }
    process.exit(1);
})

process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception detected... Server shutting down..", err);
    if (server) {
        server.close(() => {
            process.exit(1);
        });
    }
    process.exit(1);
})

export default app;