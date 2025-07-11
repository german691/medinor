import express from "express";
import {
  analyzeClients,
  bulkUpdateClients,
  confirmClientMigration,
  createNewClient,
  getClientById,
  getClients,
  loginClient,
  updateClientById,
} from "./client.controller.js";

import { validateReqBody } from "../../../interface/middleware/joi.middleware.js";

import { createClientSchema, updateClientSchema } from "./client.validation.js";

const router = express.Router();

router.post("/get", getClients);
router.get("/get/:id", getClientById);
router.post("/add", validateReqBody(createClientSchema), createNewClient);
router.put("/update", bulkUpdateClients);
router.put(
  "/update/:id",
  validateReqBody(updateClientSchema),
  updateClientById
);
router.post("/analyze", analyzeClients);
router.post("/make-migration", confirmClientMigration);

/** AUTENTICACIÓN **/
// login
router.post("/login", loginClient);

// reset password
router.post("/reset-password", resetPassword);

export default router;
