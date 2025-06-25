import express from "express";
import { analyzeClients, confirmClientMigration } from "./client.controller.js";
const router = express.Router();

router.post("/analyze", analyzeClients);
router.post("/make-migration", confirmClientMigration);

export default router;
