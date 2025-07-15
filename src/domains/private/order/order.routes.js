import express from "express";
import { addOrder, getOrders } from "./order.controller.js";
import { Roles } from "../../roles.js";
import auth from "../../../interface/middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route POST /add
 * @desc Crea una nueva orden de pedido.
 * @access Private (solo CLIENT, requiere autenticación y usuario activo)
 * @body {Object} body - Datos de la orden a crear.
 * @body {Array<Object>} body.items - Array de productos en la orden, con `productId` y `quantity`.
 * @returns {Object} La orden creada con un mensaje de éxito.
 */
router.post("/add", auth(Roles.CLIENT), addOrder);

/**
 * @route POST /get
 * @desc Obtener lista de órdenes de pedido según filtros y paginación.
 * @access Private (CLIENT ve sus propias órdenes; ADMIN/SUPERADMIN ven todas).
 * @body {Object} [filters] - Filtros para la búsqueda de órdenes.
 * @body {number} [page=1] - Número de página para la paginación.
 * @body {number} [limit=25] - Cantidad de elementos por página.
 * @body {Object} [sort] - Criterios de ordenamiento (ej. `{ key: "createdAt", direction: -1 }`).
 * @returns {Object} Un objeto con las órdenes obtenidas, paginación y metadatos.
 * @returns {Array} returns.items - Lista de órdenes obtenidas.
 * @returns {number} returns.page - Número de página actual.
 * @returns {number} returns.totalPages - Total de páginas disponibles.
 * @returns {number} returns.totalItems - Total de órdenes que coinciden con los filtros.
 */
router.post(
  "/get",
  auth([Roles.CLIENT, Roles.ADMIN, Roles.SUPERADMIN]),
  getOrders
);

export default router;
