import Client from "../../domains/private/client/client.model.js";
import { Admin } from "../../domains/private/admin/admin.model.js";
import { Roles } from "../../domains/roles.js";

/**
 * @desc Middleware para validar que el usuario autenticado esté activo.
 *       Aplica para clientes y administradores según su rol.
 *       Debe ir luego de auth() para que req.user sea válido.
 */
export const verifyUserActive = async (req, res, next) => {
  const { id, role } = req.user;

  if (role === Roles.CLIENT) {
    const client = await Client.findOne({ _id: id, active: true });

    if (!client) {
      return res
        .status(403)
        .json({ message: "Cuenta inactiva o no encontrada." });
    }

    req.client = client;
  } else if (role === Roles.ADMIN || role === Roles.SUPERADMIN) {
    const admin = await Admin.findOne({ _id: id, active: true });

    if (!admin) {
      return res
        .status(403)
        .json({ message: "Cuenta inactiva o no encontrada." });
    }

    req.admin = admin;
  } else {
    return res.status(403).json({ message: "Prohibido" });
  }

  next();
};
