import { Server,createServer } from 'http';
import { envVars } from './app/config/env';
import mongoose from 'mongoose';
import app from './app';
import { seedAdmin } from './app/utils/seedAdmin';
import { agenda } from './app/agenda/agenda';
import './app/agenda/jobs/ride.job';
import { initializeSocket } from './app/config/socket';



let server: Server

const startServer = async () => {
    try {
        await mongoose.connect(envVars.DB_URL)

        console.log("Connected to DB!!");
        const httpServer = createServer(app);
        initializeSocket(httpServer);

        server = httpServer.listen(envVars.PORT, () => {
            console.log(`Server is listening to port ${envVars.PORT}`);
        });
    } catch (error) {
        console.log(error);
    }
}
(async () => {
    await startServer();
    await seedAdmin();
    await agenda.start();
    
})()

process.on("SIGTERM", () => {
    console.log("SIGTERM signal received... Server shutting down..");

    if (server) {
        server.close(() => {
            process.exit(1)
        });
    }

    process.exit(1)
})

process.on("SIGINT", () => {
    console.log("SIGINT signal received... Server shutting down..");

    if (server) {
        server.close(() => {
            process.exit(1)
        });
    }

    process.exit(1)
})


process.on("unhandledRejection", (err) => {
    console.log("Unhandled Rejection detected... Server shutting down..", err);

    if (server) {
        server.close(() => {
            process.exit(1)
        });
    }

    process.exit(1)
})

process.on("uncaughtException", (err) => {
    console.log("Uncaught Exception detected... Server shutting down..", err);

    if (server) {
        server.close(() => {
            process.exit(1)
        });
    }

    process.exit(1)
})



