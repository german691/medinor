// Archivo: client.routes.js

import express from "express";
import {
  analyzeClients,
  confirmClientMigration,
  createNewClient,
  getAllClients,
  getClientById,
  updateClientById,
} from "./client.controller.js";

import { validateReqBody } from "../../interface/middleware/joi.middleware.js";

import { createClientSchema, updateClientSchema } from "./client.validation.js";

const router = express.Router();

router
  .route("/")
  .get(getAllClients)
  .post(validateReqBody(createClientSchema), createNewClient);

router
  .route("/:id")
  .get(getClientById)
  .put(validateReqBody(updateClientSchema), updateClientById);

router.post("/analyze", analyzeClients);
router.post("/make-migration", confirmClientMigration);

export default router;
