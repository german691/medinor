import express from "express";
import { createCategories, getCategories } from "./category.controller.js";

const router = express.Router();

router.get("/", getCategories);
router.post("/", createCategories);

export default router;
