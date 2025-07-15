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
import { verifyUserActive } from "../../../interface/middleware/status.middleware.js";
import auth from "../../../interface/middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route POST /get
 * @desc Obtiene un listado paginado de productos, con opciones de filtrado, ordenamiento y búsqueda.
 * @access Private (requiere autenticación y usuario activo).
 * @body {Object} [body] - Objeto con parámetros para la consulta.
 * @body {number} [body.page=1] - Número de página para la paginación.
 * @body {number} [body.limit=25] - Cantidad de productos por página.
 * @body {Object} [body.filters={}] - Objeto con criterios de filtrado adicionales.
 * @body {Object} [body.sort={}] - Criterios de ordenamiento (ej. `{ key: "code", direction: 1 }`).
 * @body {string} [body.search=""] - Texto para buscar en `code`, `notes`, `desc`, `extra_desc`, o nombres de `lab` y `category`.
 * @returns {200} - Retorna un objeto con la lista de productos, paginación y metadatos:
 * - `page`: Número de página actual.
 * - `totalPages`: Total de páginas disponibles.
 * - `totalItems`: Total de productos que coinciden con los filtros.
 * - `items`: Array de objetos de producto, incluyendo `id`, nombres de laboratorio y categoría, y descuento calculado.
 * @returns {500} - Retorna un error interno del servidor si falla la consulta.
 */
router.post("/get", auth(), verifyUserActive, getProducts);

/**
 * @route POST /get/:id
 * @desc Obtiene los detalles de un producto específico por su ID.
 * Aunque usa POST, es para obtener un recurso por ID.
 * @access Private (requiere autenticación y usuario activo).
 * @param {string} id - ID del producto a buscar en los parámetros de la URL.
 * @returns {200} - Retorna un objeto con el producto encontrado y formateado.
 * @returns {400} - Retorna un error si el ID del producto es inválido.
 * @returns {404} - Retorna un error si el producto no es encontrado.
 * @returns {500} - Retorna un error interno del servidor si ocurre un fallo durante la consulta.
 */
router.post("/get/:id", auth(), verifyUserActive, getProductById);

/**
 * @route POST /add
 * @desc Crea un nuevo producto en la base de datos.
 * @access Private (requiere autenticación y usuario activo).
 * @body {Object} product - Datos del nuevo producto a crear.
 * @body {string} product.code - Código único del producto.
 * @body {string} product.desc - Descripción del producto.
 * @body {string} product.lab - Nombre del laboratorio.
 * @body {string} product.category - Nombre de la categoría.
 * @returns {201} - Retorna un mensaje de éxito y el objeto del producto creado.
 * @returns {400} - Retorna un error si faltan datos obligatorios o si el laboratorio/categoría son inválidos.
 * @returns {409} - Retorna un error si ya existe un producto con el mismo código.
 * @returns {500} - Retorna un error interno del servidor si falla la creación.
 */
router.post("/add", auth(), verifyUserActive, createProduct);

/**
 * @route PUT /update
 * @desc Actualiza múltiples productos de forma masiva.
 * @access Private (requiere autenticación y usuario activo).
 * @body {Array<Object>} products - Lista de objetos de producto, donde cada objeto
 * debe contener el `_id` del producto y los campos a actualizar.
 * @returns {200} - Retorna un mensaje de éxito y los productos actualizados si todas las actualizaciones fueron exitosas.
 * @returns {207} - Retorna un mensaje de éxito parcial con detalles de errores si algunas actualizaciones fallaron.
 * @returns {400} - Retorna un error si el cuerpo de la solicitud no es un array válido o está vacío.
 */
router.put("/update", auth(), verifyUserActive, bulkUpdateProducts);

/**
 * @route PUT /:id
 * @desc Actualiza un producto específico por su ID.
 * @access Private (requiere autenticación y usuario activo).
 * @param {string} id - ID del producto a actualizar en los parámetros de la URL.
 * @body {Object} updates - Campos a actualizar del producto.
 * @returns {200} - Retorna un mensaje de éxito y el objeto del producto actualizado.
 * @returns {400} - Retorna un error si el ID del producto o los datos de actualización son inválidos.
 * @returns {404} - Retorna un error si el producto no es encontrado.
 * @returns {409} - Retorna un error si el código proporcionado ya está en uso por otro producto.
 * @returns {500} - Retorna un error interno del servidor si falla la actualización.
 */
router.put("/:id", auth(), verifyUserActive, updateProduct);

/**
 * @route POST /analyze
 * @desc Analiza un listado de productos proporcionado para identificar nuevos, existentes y conflictivos,
 * preparando los datos para una migración masiva.
 * @access Público.
 * @body {Array<Object>} products - Array de objetos de producto a analizar.
 * @returns {200} - Retorna un resumen detallado del análisis con estadísticas y listas de productos clasificados.
 * @returns {400} - Retorna un error si el array de productos es inválido o vacío.
 */
router.post("/analyze", analyzeProducts);

/**
 * @route POST /make-migration
 * @desc Confirma y ejecuta la migración masiva de productos previamente analizados.
 * @access Público.
 * @body {Array<Object>} productsToMigrate - Array de objetos de producto listos para ser creados.
 * @returns {201} - Retorna el resultado de la migración, incluyendo el conteo de productos creados y errores de inserción.
 * @returns {400} - Retorna un error si no se reciben productos válidos para migrar.
 * @returns {500} - Retorna un error interno del servidor si falla el proceso de migración.
 */
router.post("/make-migration", confirmProductMigration);

export default router;
