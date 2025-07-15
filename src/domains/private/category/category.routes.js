import express from "express";
import { createCategories, getCategories } from "./category.controller.js";
import { Roles } from "../../roles.js";
import auth from "../../../interface/middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route GET /
 * @desc Obtiene un listado de todas las categorías existentes.
 * @access Privado (ADMIN, SUPERADMIN, requiere autenticación).
 * @returns {200} - Retorna un objeto con un array de categorías.
 * @returns {Array<Object>} returns.items - Lista de objetos de categoría, cada uno con la propiedad `category` (el nombre).
 * @returns {500} - Retorna un error interno del servidor si falla la consulta.
 */
router.get("/", auth([Roles.ADMIN, Roles.SUPERADMIN]), getCategories);

/**
 * @route POST /
 * @desc Crea una nueva categoría en el sistema.
 * @access Privado (ADMIN, SUPERADMIN, requiere autenticación).
 * @body {Object} body - El cuerpo de la solicitud, conteniendo el nombre de la categoría.
 * @body {string} body.name - El nombre de la categoría a crear.
 * @returns {201} - Retorna un mensaje de éxito y el objeto de la categoría creada.
 * @returns {400} - Retorna un error si no se proporciona un nombre para la categoría.
 * @returns {409} - Retorna un error si ya existe una categoría con el mismo nombre.
 * @returns {500} - Retorna un error interno del servidor si falla la creación.
 */
router.post("/", auth([Roles.ADMIN, Roles.SUPERADMIN]), createCategories);

export default router;
