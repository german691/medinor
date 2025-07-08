import express from "express";

const router = express.Router();

router.get("/", getOrders);
router.post("/", createLab);

export default router;
