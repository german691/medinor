import express from "express";
import { roles } from "../../../config/roles.js";
import {
  handleAdminLogin,
  handleAdminRegister,
  handleDeleteAdmin,
  handleGetAdminById,
  handleReactivateAdmin,
  handleResetAdminPassword,
} from "./admin.handler.js";
import auth from "../../../interface/middleware/auth.middleware.js";

const router = express.Router();

// public
router.post("/login", handleAdminLogin);

// private
router.post("/register", auth([roles.superadmin]), handleAdminRegister);
router.get("/:adminId", auth([roles.superadmin]), handleGetAdminById);
router.delete("/:adminId", auth([roles.superadmin]), handleDeleteAdmin);
router.put("/:adminId", auth([roles.superadmin]), handleReactivateAdmin);
router.put(
  "/:adminId/reset",
  auth([roles.superadmin]),
  handleResetAdminPassword
);

export default router;
