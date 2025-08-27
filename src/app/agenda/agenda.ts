import Agenda from "agenda";
import { envVars } from "../config/env";


export const agenda = new Agenda({
  db: { address: envVars.DB_URL, collection: "agendaJobs" },
  processEvery: "10 seconds" // how often agenda checks for jobs
});

agenda.on("ready", () => {
  console.log("Agenda started");
  agenda.start();
});

agenda.on("error", (err) => console.error("Agenda error:", err));
