import express from "express";
import {
  analyzeClients,
  bulkUpdateClients,
  confirmClientMigration,
  createNewClient,
  getClientById,
  getClients,
  getSelfClientAccountInfo,
  loginClient,
  resetPassword,
  updateClientById,
} from "./client.controller.js";

import { validateReqBody } from "../../../interface/middleware/joi.middleware.js";

import { createClientSchema, updateClientSchema } from "./client.validation.js";
import auth, {
  Purposes,
} from "../../../interface/middleware/auth.middleware.js";
import { Roles } from "../../roles.js";
import { verifyUserActive } from "../../../interface/middleware/status.middleware.js";

const router = express.Router();

/**
 * @section RUTAS ACCEDIDAS POR ADMINISTRADORES
 */

/**
 * @subsection MIGRACIÓN DE CLIENTES
 */

/**
 * @route POST /analyze
 * @desc Analiza un listado de clientes proporcionado para identificar nuevos clientes,
 * clientes existentes y posibles conflictos (duplicados por CUIT o código de cliente
 * dentro del archivo o con la base de datos).
 * @access Privado (solo SUPERADMIN, requiere autenticación).
 * @body {Array<Object>} clients - Array de objetos de cliente a analizar. Cada objeto
 * debe contener al menos `COD_CLIENT`, `IDENTIFTRI` (CUIT) y `RAZON_SOCI`.
 * @returns {200} - Retorna un resumen detallado del análisis, incluyendo:
 * - `summary`: Estadísticas de clientes recibidos, válidos, inválidos, nuevos, existentes y en conflicto.
 * - `data`: Arrays de `newClients`, `currentClients`, `conflictingClients` e `invalidRows`.
 * @returns {400} - Retorna un error si el array de clientes en el cuerpo de la solicitud es inválido o vacío.
 * @returns {404} - Retorna un error si ningún cliente en el archivo pasa las validaciones iniciales.
 */
router.post("/analyze", auth(Roles.SUPERADMIN), analyzeClients);

/**
 * @route POST /make-migration
 * @desc Confirma y ejecuta la migración masiva de clientes. Inserta los clientes
 * identificados como "nuevos" en la base de datos.
 * @access Privado (solo SUPERADMIN, requiere autenticación).
 * @body {Object} body - Objeto que contiene los datos para la migración.
 * @body {Array<Object>} body.data.newClients - Array de objetos de cliente
 * listos para ser creados en la base de datos.
 * @returns {201} - Retorna el resultado de la migración, incluyendo el conteo de
 * clientes creados exitosamente y una lista de clientes que fueron duplicados
 * y no se pudieron insertar.
 * @returns {400} - Retorna un error si no se reciben clientes válidos para crear.
 * @returns {500} - Retorna un error interno del servidor si falla la operación de inserción.
 */
router.post("/make-migration", auth(Roles.SUPERADMIN), confirmClientMigration);

/**
 * @subsection GESTIÓN DE CLIENTES (CRUD)
 */

/**
 * @route POST /get
 * @desc Obtiene un listado paginado de clientes, con opciones de filtrado,
 * ordenamiento y búsqueda por campos específicos (código, razón social, CUIT, username).
 * @access Privado (ADMIN, SUPERADMIN, requiere autenticación).
 * @body {Object} [body] - Objeto con parámetros para la consulta.
 * @body {number} [body.page=1] - Número de página para la paginación.
 * @body {number} [body.limit=25] - Cantidad de clientes por página.
 * @body {Object} [body.filters={}] - Objeto con criterios de filtrado adicionales.
 * @body {Object} [body.sort={}] - Criterios de ordenamiento (ej. `{ key: "createdAt", direction: -1 }`).
 * @body {string} [body.search=""] - Texto para buscar en `cod_client`, `razon_soci`, `identiftri`, `username`.
 * @returns {200} - Retorna un objeto con la lista de clientes, paginación y metadatos:
 * - `items`: Array de clientes obtenidos.
 * - `page`: Número de página actual.
 * - `totalPages`: Total de páginas disponibles.
 * - `totalItems`: Total de clientes que coinciden con los filtros.
 * @returns {500} - Retorna un error interno del servidor si falla la consulta a la base de datos.
 */
router.post("/get", auth([Roles.ADMIN, Roles.SUPERADMIN]), getClients);

/**
 * @route GET /get/:id
 * @desc Obtiene los detalles de un cliente específico por su ID.
 * @access Privado (ADMIN, SUPERADMIN, requiere autenticación).
 * @param {string} id - ID del cliente a buscar en los parámetros de la URL.
 * @returns {200} - Retorna un objeto con el cliente encontrado.
 * @returns {404} - Retorna un error si el cliente no es encontrado.
 */
router.get("/get/:id", auth([Roles.ADMIN, Roles.SUPERADMIN]), getClientById);

/**
 * @route POST /add
 * @desc Crea un nuevo cliente en el sistema. Los datos son validados
 * por el esquema `createClientSchema`.
 * @access Público (usado para registro de nuevos clientes).
 * @body {Object} client - Objeto con los datos del nuevo cliente a crear.
 * Incluye `cod_client`, `razon_soci`, `identiftri`, `username` (opcional, por defecto CUIT),
 * `password` (opcional, por defecto CUIT), `active` (opcional).
 * @returns {201} - Retorna un mensaje de éxito y el objeto del cliente creado.
 * @returns {400} - Retorna un error si los datos proporcionados son inválidos según el esquema Joi.
 * @returns {409} - Retorna un error si ya existe un cliente con datos únicos duplicados (ej. email).
 */
router.post("/add", validateReqBody(createClientSchema), createNewClient);

/**
 * @route PUT /update
 * @desc Actualiza múltiples clientes de forma masiva. Permite actualizar
 * varios campos de diferentes clientes en una sola solicitud.
 * @access Privado (solo ADMIN, requiere autenticación).
 * @body {Array<Object>} clients - Array de objetos, donde cada objeto debe
 * contener el `_id` del cliente a actualizar y los campos a modificar.
 * @returns {200} - Retorna un mensaje de éxito y la lista de clientes actualizados
 * si todas las actualizaciones fueron exitosas.
 * @returns {207} - Retorna un mensaje de éxito parcial con detalles de los errores
 * encontrados para los clientes que no pudieron actualizarse.
 * @returns {400} - Retorna un error si el cuerpo de la solicitud no es un array válido o está vacío.
 */
router.put("/update", auth(Roles.ADMIN), bulkUpdateClients);

/**
 * @route PUT /update/:id
 * @desc Actualiza los datos de un cliente específico por su ID.
 * Los datos de actualización son validados por el esquema `updateClientSchema`.
 * @access Privado (ADMIN, SUPERADMIN, requiere autenticación).
 * @param {string} id - ID del cliente a actualizar en los parámetros de la URL.
 * @body {Object} updates - Objeto con los campos del cliente a actualizar.
 * Puede incluir `cod_client`, `razon_soci`, `identiftri`, `username`, `password`, `active`, etc.
 * @returns {200} - Retorna un mensaje de éxito y el objeto del cliente actualizado.
 * @returns {400} - Retorna un error si el ID del cliente es inválido o los datos de actualización no son válidos.
 * @returns {404} - Retorna un error si el cliente no es encontrado.
 * @returns {409} - Retorna un error si el `cod_client`, `identiftri` o `username`
 * proporcionado ya está en uso por otro cliente.
 * @returns {500} - Retorna un error interno del servidor si falla la actualización.
 */
router.put(
  "/update/:id",
  validateReqBody(updateClientSchema),
  updateClientById
);

////////////////////////////////////////////////////////////////////////////////

/**
 * @section RUTAS ACCEDIDAS POR CLIENTE
 */

/**
 * @route POST /login
 * @desc Autentica a un cliente en el sistema.
 * @access Público.
 * @body {Object} credentials - Objeto con las credenciales del cliente.
 * @body {string} credentials.username - Nombre de usuario del cliente.
 * @body {string} credentials.password - Contraseña del cliente.
 * @returns {200} - Retorna un token de autenticación y el rol del cliente.
 * Si el cliente debe cambiar la contraseña, retorna un mensaje y un token de propósito específico.
 * @returns {400} - Retorna un error si las credenciales (username o password) no son proporcionadas.
 * @returns {401} - Retorna un error si las credenciales son incorrectas.
 * @returns {403} - Retorna un error si el usuario está desactivado.
 */
router.post("/login", loginClient);

/**
 * @route POST /reset-password
 * @desc Permite a un cliente restablecer su contraseña. Requiere un token
 * de propósito `resetPassword` para ser autorizado.
 * @access Privado (solo CLIENT con token `resetPassword`, requiere autenticación).
 * @body {Object} body - Objeto con la nueva contraseña.
 * @body {string} body.newPassword - La nueva contraseña para el cliente.
 * @returns {200} - Retorna un mensaje de éxito si la contraseña se restablece correctamente.
 * @returns {401} - Retorna un error si el token no es válido o no tiene el propósito correcto.
 * @returns {500} - Retorna un error interno del servidor si falla la actualización de la contraseña.
 */
router.post(
  "/reset-password",
  auth(Roles.CLIENT, Purposes.resetPassword),
  resetPassword
);

/**
 * @route GET /me
 * @desc Obtiene la información de la cuenta del cliente autenticado.
 * @access Privado (solo CLIENT, requiere autenticación y usuario activo).
 * @returns {200} - Retorna un objeto con la información del cliente autenticado
 * (ID, username, razón social).
 * @returns {401} - Retorna un error si no hay un cliente autenticado.
 * @returns {403} - Retorna un error si el usuario no está activo.
 */
router.get(
  "/me",
  auth(Roles.CLIENT),
  verifyUserActive,
  getSelfClientAccountInfo
);

export default router;
