import express from "express";
import { createLab, getLabs } from "./lab.controller.js";

const router = express.Router();

router.get("/", getLabs);
router.post("/", createLab);

export default router;
