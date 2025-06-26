import express from "express";
import {
  analyzeClients,
  confirmClientMigration,
  createNewClient,
  deleteClientById,
  getAllClients,
  getClientById,
  updateClientById,
} from "./client.controller.js";
import { validateReqBody } from "../../interface/middleware/joi.middleware.js";
import { clientMigrationSchema } from "./client.validation.js";
const router = express.Router();

router.route("/").get(getAllClients).post(createNewClient);

router
  .route("/:id")
  .get(getClientById)
  .put(updateClientById)
  .delete(deleteClientById);

router.post("/analyze", analyzeClients);
router.post("/make-migration", confirmClientMigration);

export default router;
