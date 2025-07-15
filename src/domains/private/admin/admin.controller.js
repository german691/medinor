import { createToken } from "../../../util/createToken.js";
import { hashData, verifyHashedData } from "../../../util/hashData.js";
import { Admin } from "./admin.model.js";
import createError from "http-errors";

/**
 * Verifica si un administrador con el nombre de usuario dado existe en la base de datos.
 * Esta es una función auxiliar interna del controlador.
 *
 * @param {string} username - Nombre de usuario del administrador a verificar.
 * @returns {Promise<Object>} - Retorna el objeto del administrador si existe.
 * @returns {404} - Envía una respuesta 404 si el administrador no es encontrado.
 */
const verifyAdminExists = async (username) => {
  const admin = await Admin.findOne({ username });
  if (!admin) throw createError(404, "Usuario no encontrado");
  return admin;
};

/**
 * Obtiene los detalles de un administrador por su ID.
 *
 * @param {string} adminId - ID del administrador.
 * @returns {Promise<Object>} - Retorna un objeto con los detalles del administrador: `username`, `fullName`, `role`, `active`.
 * @returns {404} - Envía una respuesta 404 si el administrador no es encontrado.
 */
export const getAdminById = async (adminId) => {
  const admin = await Admin.findById(adminId);
  if (!admin) throw createError(404, "Usuario no encontrado");
  return {
    username: admin.username,
    fullName: admin.fullName,
    role: admin.role,
    active: admin.active,
  };
};

/**
 * Crea un nuevo administrador en la base de datos. Encripta la contraseña antes de guardarla.
 *
 * @param {string} username - Nombre de usuario del nuevo administrador (debe ser único).
 * @param {string} password - Contraseña del nuevo administrador.
 * @param {string} fullName - Nombre completo del nuevo administrador.
 * @returns {Promise<Object>} - Retorna el objeto del nuevo administrador guardado en la base de datos.
 * @returns {400} - Envía una respuesta 400 si faltan los campos requeridos (`username`, `password`, `fullName`).
 * @returns {409} - Envía una respuesta 409 si el nombre de usuario ya está en uso.
 */
export const createNewAdmin = async (username, password, fullName) => {
  if (!username || !password || !fullName)
    throw createError(400, "Username, password y fullName requeridos");

  const existingAdmin = await Admin.findOne({ username });
  if (existingAdmin) throw createError(409, "Nombre de usuario no disponible");

  const hashedPassword = await hashData(password);
  const newAdmin = new Admin({ username, password: hashedPassword, fullName });

  return newAdmin.save();
};

/**
 * Autentica a un administrador verificando sus credenciales.
 * Genera un token de autenticación si las credenciales son válidas y la cuenta está activa.
 *
 * @param {string} username - Nombre de usuario del administrador.
 * @param {string} password - Contraseña del administrador.
 * @returns {Promise<Object>} - Retorna un objeto con el `token` de autenticación y el `role` del administrador.
 * @returns {401} - Envía una respuesta 401 si la contraseña es incorrecta.
 * @returns {403} - Envía una respuesta 403 si la cuenta del administrador está inactiva.
 * @returns {404} - Envía una respuesta 404 si el nombre de usuario no existe (a través de `verifyAdminExists`).
 */
export const authenticateAdmin = async (username, password) => {
  const admin = await verifyAdminExists(username);

  const isMatch = await verifyHashedData(password, admin.password);
  if (!isMatch) throw createError(401, "Credenciales incorrectas");

  if (!admin.active) throw createError(403, "Usuario desactivado");

  const token = await createToken({
    payload: { id: admin._id, username: admin.username, role: admin.role },
  });

  return { token, role: admin.role };
};

/**
 * Actualiza la información de un administrador por su ID.
 *
 * @param {string} adminId - ID del administrador a actualizar.
 * @param {Object} updates - Objeto con los campos a actualizar del administrador.
 * @returns {Promise<Object>} - Retorna el objeto del administrador actualizado.
 * @returns {404} - Envía una respuesta 404 si el administrador no es encontrado.
 */
export const updateAdminInfo = async (adminId, updates) => {
  const updatedAdmin = await Admin.findByIdAndUpdate(adminId, updates, {
    new: true,
  });
  if (!updatedAdmin) throw createError(404, "Usuario no encontrado");
  return updatedAdmin;
};

/**
 * Restablece la contraseña de un administrador específico por su ID.
 * La nueva contraseña se encripta antes de ser guardada.
 *
 * @param {string} adminId - ID del administrador cuya contraseña se va a restablecer.
 * @param {string} newPassword - La nueva contraseña.
 * @returns {Promise<Object>} - Retorna el objeto del administrador con la contraseña actualizada.
 * @returns {404} - Envía una respuesta 404 si el administrador no es encontrado.
 */
export const resetAdminPassword = async (adminId, newPassword) => {
  const hashedPassword = await hashData(newPassword);
  const updatedAdmin = await Admin.findByIdAndUpdate(
    adminId,
    { password: hashedPassword },
    { new: true }
  );
  if (!updatedAdmin) throw createError(404, "Usuario no encontrado");
  return updatedAdmin;
};

/**
 * Obtiene un listado de todos los administradores en la base de datos.
 *
 * @returns {Promise<Array<Object>>} - Retorna un array de objetos de administrador.
 */
export const getAdminList = async () => {
  const admins = await Admin.find()
    .select("username fullName role active")
    .lean();
  return admins;
};

/**
 * Realiza un "soft delete" (desactivación lógica) de la cuenta de un administrador.
 * Marca la cuenta como inactiva en lugar de eliminarla físicamente.
 *
 * @param {string} adminId - ID del administrador a desactivar.
 * @returns {Promise<Object>} - Retorna el objeto del administrador desactivado.
 * @returns {404} - Envía una respuesta 404 si el administrador no es encontrado.
 */
export const softDeleteAdmin = async (adminId) => {
  const admin = await Admin.findByIdAndUpdate(
    adminId,
    { active: false },
    { new: true }
  );
  if (!admin) throw createError(404, "Usuario inválido");
  return admin;
};

/**
 * Reactiva la cuenta de un administrador previamente desactivado.
 *
 * @param {string} adminId - ID del administrador a reactivar.
 * @returns {Promise<Object>} - Retorna el objeto del administrador reactivado.
 * @returns {404} - Envía una respuesta 404 si el administrador no es encontrado.
 */
export const reactivateAdmin = async (adminId) => {
  const admin = await Admin.findByIdAndUpdate(
    adminId,
    { active: true },
    { new: true }
  );
  if (!admin) throw createError(404, "Usuario inválido");
  return admin;
};
