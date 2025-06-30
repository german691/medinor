import express from "express";
import {
  analyzeProducts,
  confirmProductMigration,
  getProducts, // GET /api/products
  getProductById, // GET /api/products/:id (Nuevo)
  createProduct, // POST /api/products
  updateProduct, // PUT /api/products/:id
  deleteProduct, // DELETE /api/products/:id
} from "./product.controller.js"; // Asegúrate de que esta ruta sea correcta

const router = express.Router();

// Rutas para la migración de productos
router.post("/analyze", analyzeProducts);
router.post("/make-migration", confirmProductMigration);

// Rutas para el CRUD de productos individuales
router.get("/", getProducts); // Obtener todos los productos
router.get("/:id", getProductById); // Obtener un producto por ID
router.post("/", createProduct); // Crear un nuevo producto
router.put("/:id", updateProduct); // Actualizar un producto existente
router.delete("/:id", deleteProduct); // Eliminar un producto

export default router;
