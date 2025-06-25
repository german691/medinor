import express from "express";
import { analyzeClients, confirmClientMigration } from "./client.controller.js";
import { validateReqBody } from "../../interface/middleware/joi.middleware.js";
import { clientMigrationSchema } from "./client.validation.js";
const router = express.Router();

router.post("/analyze", analyzeClients);
router.post("/make-migration", confirmClientMigration);

export default router;
