import express from "express";
import {
  analyzeProducts,
  confirmProductMigration,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
} from "./product.controller.js";

const router = express.Router();

router.post("/analyze", analyzeProducts);
router.post("/make-migration", confirmProductMigration);

router.get("/", getProducts);
router.post("/:id", getProductById);
router.post("/", createProduct);
router.put("/:id", updateProduct);

export default router;
