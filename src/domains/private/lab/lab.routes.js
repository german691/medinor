import express from "express";
import { getLabs } from "./lab.controller.js";

const router = express.Router();

router.get("/", getLabs);

export default router;
