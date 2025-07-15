import express from "express";
import {
  handleAdminLogin,
  handleAdminRegister,
  handleDeleteAdmin,
  handleGetAdminById,
  handleReactivateAdmin,
  handleResetAdminPassword,
} from "./admin.handler.js";
import auth from "../../../interface/middleware/auth.middleware.js";
import { Roles } from "../../roles.js";

const router = express.Router();

/**
 * @section RUTAS PÚBLICAS
 */

/**
 * @route POST /login
 * @desc Autentica a un administrador en el sistema.
 * @access Público.
 * @body {Object} credentials - Objeto con las credenciales del administrador.
 * @body {string} credentials.username - Nombre de usuario del administrador.
 * @body {string} credentials.password - Contraseña del administrador.
 * @returns {200} - Retorna un token de autenticación y el rol del administrador.
 * @returns {400} - Retorna un error si las credenciales son inválidas o incompletas (validación de esquema Joi).
 * @returns {401} - Retorna un error si las credenciales son incorrectas.
 * @returns {403} - Retorna un error si la cuenta del administrador está inactiva.
 * @returns {500} - Retorna un error interno del servidor.
 */
router.post("/login", handleAdminLogin);

/**
 * @section RUTAS PRIVADAS (REQUIEREN AUTENTICACIÓN)
 */

/**
 * @route POST /register
 * @desc Registra un nuevo administrador en el sistema.
 * Requiere una clave de administrador especial en los headers (`x-admin-key`).
 * @access Private (solo SUPERADMIN, requiere autenticación).
 * @header {string} x-admin-key - Clave de acceso secreta para el registro de administradores.
 * @body {Object} adminData - Datos del nuevo administrador.
 * @body {string} adminData.username - Nombre de usuario único para el nuevo administrador.
 * @body {string} adminData.password - Contraseña para el nuevo administrador.
 * @body {string} adminData.fullName - Nombre completo del nuevo administrador.
 * @returns {200} - Retorna el ID, nombre de usuario, nombre completo y rol del administrador creado.
 * @returns {400} - Retorna un error si los datos de registro son inválidos o incompletos (validación de esquema Joi).
 * @returns {401} - Retorna un error si la clave 'x-admin-key' es incorrecta.
 * @returns {409} - Retorna un error si el nombre de usuario ya está en uso.
 * @returns {500} - Retorna un error interno del servidor si falla el proceso de registro.
 */
router.post("/register", auth([Roles.SUPERADMIN]), handleAdminRegister);

/**
 * @route GET /:adminId
 * @desc Obtiene los detalles de un administrador específico por su ID.
 * @access Private (ADMIN, SUPERADMIN, requiere autenticación).
 * @param {string} adminId - ID del administrador a buscar en los parámetros de la URL.
 * @returns {200} - Retorna un objeto con los detalles del administrador (username, fullName, role, active).
 * @returns {404} - Retorna un error si el administrador no es encontrado.
 * @returns {500} - Retorna un error interno del servidor.
 */
router.get(
  "/:adminId",
  auth([Roles.ADMIN, Roles.SUPERADMIN]),
  handleGetAdminById
);

/**
 * @route DELETE /:adminId
 * @desc Realiza un "soft delete" (desactivación) de la cuenta de un administrador por su ID.
 * La cuenta no se elimina físicamente, solo se marca como inactiva.
 * @access Private (solo SUPERADMIN, requiere autenticación).
 * @param {string} adminId - ID del administrador a desactivar en los parámetros de la URL.
 * @returns {200} - Retorna un mensaje de éxito indicando que el administrador fue desactivado.
 * @returns {404} - Retorna un error si el administrador no es encontrado.
 * @returns {500} - Retorna un error interno del servidor.
 */
router.delete("/:adminId", auth([Roles.SUPERADMIN]), handleDeleteAdmin);

/**
 * @route PUT /:adminId
 * @desc Reactiva la cuenta de un administrador previamente desactivado por su ID.
 * @access Private (solo SUPERADMIN, requiere autenticación).
 * @param {string} adminId - ID del administrador a reactivar en los parámetros de la URL.
 * @returns {200} - Retorna un mensaje de éxito indicando que el administrador fue reactivado.
 * @returns {404} - Retorna un error si el administrador no es encontrado.
 * @returns {500} - Retorna un error interno del servidor.
 */
router.put("/:adminId", auth([Roles.SUPERADMIN]), handleReactivateAdmin);

/**
 * @route PUT /:adminId/reset
 * @desc Restablece la contraseña de un administrador específico por su ID.
 * @access Private (solo SUPERADMIN, requiere autenticación).
 * @param {string} adminId - ID del administrador cuya contraseña se va a restablecer en los parámetros de la URL.
 * @body {Object} body - Objeto con la nueva contraseña.
 * @body {string} body.newPassword - La nueva contraseña para el administrador.
 * @returns {200} - Retorna un mensaje de éxito indicando que la contraseña fue reseteada.
 * @returns {400} - Retorna un error si no se proporciona una nueva contraseña.
 * @returns {404} - Retorna un error si el administrador no es encontrado.
 * @returns {500} - Retorna un error interno del servidor.
 */
router.put(
  "/:adminId/reset",
  auth([Roles.SUPERADMIN]),
  handleResetAdminPassword
);

export default router;
