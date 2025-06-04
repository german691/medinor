import express from "express";
import adminRoutes from "../../domains/private/admin/admin.routes.js";
import statusRoutes from "../../domains/public/status/status.routes.js";
import accountRoutes from "../../domains/public/accounts/account.routes.js";
import documentRoutes from "../../domains/private/users/document/document.routes.js";
import auth from "../middleware/auth.middleware.js";
import ROLES from "../../config/roles.js";
import { multerErrorHandler } from "../middleware/error.middleware.js";
import { addBucketToRequest } from "../middleware/bucket.middleware.js";

// router.use("/admin/user", auth(ROLES.admin), adminUserRoutes);

const router = express.Router();

// router.use("/admin", auth([ROLES.admin, ROLES.superadmin]), adminRoutes);
router.use("/admin", adminRoutes);
router.use("/status", statusRoutes);
router.use("/account", accountRoutes);
router.use(
  "/document",
  auth(),
  multerErrorHandler,
  addBucketToRequest,
  documentRoutes
);

export default router;
