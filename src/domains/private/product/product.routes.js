import express from "express";
import {
  analyzeProducts,
  confirmProductMigration,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  bulkUpdateProducts,
} from "./product.controller.js";

const router = express.Router();

router.post("/get", getProducts);
router.post("/get/:id", getProductById);
router.post("/add", createProduct);
router.put("/update", bulkUpdateProducts);
router.put("/:id", updateProduct);

router.post("/analyze", analyzeProducts);
router.post("/make-migration", confirmProductMigration);

export default router;
