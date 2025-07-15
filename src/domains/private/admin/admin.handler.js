import asyncHandler from "express-async-handler";
import {
  authenticateAdmin,
  createNewAdmin,
  getAdminById,
  getAdminList,
  reactivateAdmin,
  resetAdminPassword,
  softDeleteAdmin,
  updateAdminInfo,
} from "./admin.controller.js";
import { loginSchema, registerSchema } from "./admin.schema.js";
import createError from "http-errors";

/**
 * Maneja la solicitud para registrar un nuevo administrador.
 * Valida la clave de administrador y los datos de registro antes de crear el administrador.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} req.headers - Encabezados de la solicitud.
 * @param {string} req.headers["x-admin-key"] - Clave secreta para autorizar el registro.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos del nuevo administrador.
 * @param {string} req.body.username - Nombre de usuario.
 * @param {string} req.body.password - Contraseña.
 * @param {string} req.body.fullName - Nombre completo.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un objeto con el `_id`, `username`, `fullName` y `role` del administrador creado.
 * @returns {400} - Retorna un error si falta el nombre de usuario, contraseña o nombre completo, o si no pasa la validación de esquema Joi.
 * @returns {401} - Retorna un error si la clave `x-admin-key` es incorrecta o no está definida.
 * @returns {409} - Retorna un error si el nombre de usuario ya existe.
 * @throws {Error} - Lanza un error si `ADMIN_KEY` no está definido en las variables de entorno.
 */
export const handleAdminRegister = asyncHandler(async (req, res) => {
  const key = req.headers["x-admin-key"];
  if (!process.env.ADMIN_KEY) {
    throw createError(500, "Admin token key no definido en .env");
  }

  if (key !== process.env.ADMIN_KEY)
    throw createError(500, "Acceso no autorizado");

  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    throw error;
  }

  const response = await createNewAdmin(
    value.username,
    value.password,
    value.fullName
  );

  res.status(200).json({
    _id: response.id,
    username: response.username,
    fullName: response.fullName,
    role: response.role,
  });
});

/**
 * Maneja la solicitud de inicio de sesión de un administrador.
 * Valida las credenciales y autentica al administrador.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} req.body - Cuerpo de la solicitud con las credenciales.
 * @param {string} req.body.username - Nombre de usuario del administrador.
 * @param {string} req.body.password - Contraseña del administrador.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un objeto con un `token` de autenticación y el `role` del administrador.
 * @returns {400} - Retorna un error si las credenciales son inválidas o incompletas (validación de esquema Joi).
 * @returns {401} - Retorna un error si el nombre de usuario no existe o la contraseña es incorrecta.
 * @returns {403} - Retorna un error si la cuenta del administrador está desactivada.
 */
export const handleAdminLogin = asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw error;
  }

  const { token, role } = await authenticateAdmin(
    value.username,
    value.password
  );
  res.status(200).json({ token, role });
});

/**
 * NOTA: Sin utilizar.
 *
 * Maneja la solicitud para actualizar la información de un administrador existente.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.params.adminId - ID del administrador a actualizar.
 * @param {Object} req.body - Cuerpo de la solicitud con los campos a actualizar.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna el objeto del administrador actualizado.
 * @returns {404} - Retorna un error si el administrador no es encontrado.
 * @returns {500} - Retorna un error interno del servidor.
 */
export const handleUpdateAdminInfo = asyncHandler(async (req, res) => {
  const updatedAdmin = await updateAdminInfo(req.params.adminId, req.body);
  res.status(200).json(updatedAdmin);
});

/**
 * Maneja la solicitud para restablecer la contraseña de un administrador.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.params.adminId - ID del administrador cuya contraseña se va a restablecer.
 * @param {Object} req.body - Cuerpo de la solicitud con la nueva contraseña.
 * @param {string} req.body.newPassword - La nueva contraseña.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un mensaje de éxito indicando que la contraseña fue reseteada.
 * @returns {400} - Retorna un error si no se proporciona una nueva contraseña.
 * @returns {404} - Retorna un error si el administrador no es encontrado.
 * @returns {500} - Retorna un error interno del servidor.
 */
export const handleResetAdminPassword = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  const { newPassword } = req.body;
  if (!newPassword) {
    throw createError(400, "Nueva contraseña requerida");
  }

  await resetAdminPassword(adminId, newPassword);
  res.status(200).json({ message: "Contraseña reseteada correctamente" });
});

/**
 * Maneja la solicitud para obtener los detalles de un administrador por su ID.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.params.adminId - ID del administrador a buscar.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un objeto con el `username`, `fullName`, `role` y `active` del administrador.
 * @returns {404} - Retorna un error si el administrador no es encontrado.
 * @returns {500} - Retorna un error interno del servidor.
 */
export const handleGetAdminById = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  const admin = await getAdminById(adminId);
  res.status(200).json({ item: admin });
});

/**
 * NOTA: Sin utilizar.
 *
 * Maneja la solicitud para obtener un listado de todos los administradores.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un objeto con un array de administradores.
 * @returns {Array<Object>} returns.items - Lista de objetos de administrador.
 * @returns {500} - Retorna un error interno del servidor.
 */
export const handleGetAdminList = asyncHandler(async (req, res) => {
  const admins = await getAdminList();
  res.status(200).json({ items: admins });
});

/**
 * Maneja la solicitud para realizar un "soft delete" (desactivación) de un administrador.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.params.adminId - ID del administrador a desactivar.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un mensaje de éxito.
 * @returns {404} - Retorna un error si el administrador no es encontrado.
 * @returns {500} - Retorna un error interno del servidor.
 */
export const handleDeleteAdmin = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  await softDeleteAdmin(adminId);
  res.status(200).json({ message: "Admin soft deleted successfully" });
});

/**
 * Maneja la solicitud para reactivar la cuenta de un administrador.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.params.adminId - ID del administrador a reactivar.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un mensaje de éxito.
 * @returns {404} - Retorna un error si el administrador no es encontrado.
 * @returns {500} - Retorna un error interno del servidor.
 */
export const handleReactivateAdmin = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  await reactivateAdmin(adminId);
  res.status(200).json({ message: "Usuario activado correctamente" });
});
