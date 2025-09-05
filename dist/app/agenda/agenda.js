"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.agenda = void 0;
const agenda_1 = __importDefault(require("agenda"));
const env_1 = require("../config/env");
exports.agenda = new agenda_1.default({
    db: { address: env_1.envVars.DB_URL, collection: "agendaJobs" },
    processEvery: "10 seconds" // how often agenda checks for jobs
});
