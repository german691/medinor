import express from "express";
import { addOrder, getOrders } from "./order.controller.js";

const router = express.Router();

router.post("/add", addOrder);
router.post("/get", getOrders);

export default router;
