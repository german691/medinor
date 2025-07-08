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
import { verifyHashedData } from "../../../util/hashData.js";
import handleError from "../../../util/handleError.js";

export const handleAdminRegister = asyncHandler(async (req, res) => {
  const key = req.headers["x-admin-key"];
  if (!process.env.ADMIN_KEY) {
    throw new Error("Admin token key no definido en .env");
  }

  if (key !== process.env.ADMIN_KEY) throw new Error("Acceso no autorizado");

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
    userType: response.userType,
  });
});

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

export const handleUpdateAdminInfo = asyncHandler(async (req, res) => {
  const updatedAdmin = await updateAdminInfo(req.params.adminId, req.body);
  res.status(200).json(updatedAdmin);
});

export const handleResetAdminPassword = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  const { newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).send("No se recibió una contraseña");
  }

  await resetAdminPassword(adminId, newPassword);
  res.status(200).send("Contraseña reseteada correctamente");
});

export const handleGetAdminById = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  const admin = await getAdminById(adminId);
  res.status(200).json(admin);
});

export const handleGetAdminList = asyncHandler(async (req, res) => {
  const admins = await getAdminList();
  res.status(200).json({ items: admins });
});

export const handleDeleteAdmin = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  await softDeleteAdmin(adminId);
  res.status(200).send("Admin soft deleted successfully");
});

export const handleReactivateAdmin = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  await reactivateAdmin(adminId);
  res.status(200).send("Admin reactivated successfully");
});
