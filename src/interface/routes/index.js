import express from "express";
import clientRoutes from "../../domains/private/client/client.routes.js";
import productRoutes from "../../domains/private/product/product.routes.js";
import labRoutes from "../../domains/private/lab/lab.routes.js";
import categoryRoutes from "../../domains/private/category/category.routes.js";
import statusRoutes from "../../domains/public/status/status.routes.js";
import adminRoutes from "../../domains/private/admin/admin.routes.js";
import { roles } from "../../config/roles.js";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

router.use("/", statusRoutes);
router.use("/clients", clientRoutes);
router.use("/products", productRoutes);
router.use("/labs", labRoutes);
router.use("/categories", categoryRoutes);
router.use("/admin", adminRoutes);

// router.use(
//   "/document",
//   auth(),
//   multerErrorHandler,
//   addBucketToRequest,
//   documentRoutes
// );

export default router;
