import Agenda from "agenda";
import { envVars } from "../config/env";



export const agenda = new Agenda({
  db: { address: envVars.DB_URL, collection: "agendaJobs" },
  processEvery: "10 seconds" // how often agenda checks for jobs
});




