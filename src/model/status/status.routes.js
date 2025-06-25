import express from "express";
const router = express.Router();
import { handleStatus } from "./status.controller.js";

router.get("/", handleStatus);

export default router;
