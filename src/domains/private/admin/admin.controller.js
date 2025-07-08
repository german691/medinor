import createToken from "../../../util/createToken.js";
import handleError from "../../../util/handleError.js";
import { hashData, verifyHashedData } from "../../../util/hashData.js";
import { Admin } from "./admin.model.js";

const verifyAdminExists = async (username) => {
  const admin = await Admin.findOne({ username });
  if (!admin) return handleError("Invalid username", 404);
  return admin;
};

export const getAdminById = async (adminId) => {
  const admin = await Admin.findById(adminId);
  if (!admin) handleError("Admin not found", 404);
  return {
    username: admin.username,
    fullName: admin.fullName,
    role: admin.userType,
    active: admin.isActive,
  };
};

export const createNewAdmin = async (username, password, fullName) => {
  if (!username || !password || !fullName)
    handleError("Username, password y fullName requeridos", 400);

  const existingAdmin = await Admin.findOne({ username });
  if (existingAdmin) return handleError("Nombre de usuario no disponible", 409);

  const hashedPassword = await hashData(password);
  const newAdmin = new Admin({ username, password: hashedPassword, fullName });

  return newAdmin.save();
};

export const authenticateAdmin = async (username, password) => {
  const admin = await verifyAdminExists(username);

  const isMatch = await verifyHashedData(password, admin.password);
  if (!isMatch) return handleError("Incorrect password", 401);

  if (!admin.isActive)
    handleError(
      "Admin account currently deactivated. Contact Superadmin.",
      403
    );

  const token = await createToken({
    adminId: admin._id,
    username: admin.username,
    fullName: admin.fullName,
    userType: admin.userType,
  });

  return { token, role: admin.userType };
};

export const updateAdminInfo = async (adminId, updates) => {
  const updatedAdmin = await Admin.findByIdAndUpdate(adminId, updates, {
    new: true,
  });
  if (!updatedAdmin) return handleError("Admin no encontrado", 404);
  return updatedAdmin;
};

export const resetAdminPassword = async (adminId, newPassword) => {
  const hashedPassword = await hashData(newPassword);
  const updatedAdmin = await Admin.findByIdAndUpdate(
    adminId,
    { password: hashedPassword },
    { new: true }
  );
  if (!updatedAdmin) return handleError("Admin no encontrado", 404);
  return updatedAdmin;
};

export const getAdminList = async () => {
  const admins = await Admin.find().lean();
  return admins;
};

export const softDeleteAdmin = async (adminId) => {
  const admin = await Admin.findByIdAndUpdate(
    adminId,
    { isActive: false },
    { new: true }
  );
  if (!admin) throw handleError("Admin not found", 404);
  return admin;
};

export const reactivateAdmin = async (adminId) => {
  const admin = await Admin.findByIdAndUpdate(
    adminId,
    { isActive: true },
    { new: true }
  );
  if (!admin) throw handleError("Admin not found", 404);
  return admin;
};
