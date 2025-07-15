import jsonwebtoken from "jsonwebtoken";
const { TokenExpiredError } = jsonwebtoken;

export const Purposes = {
  session: "session",
  resetPassword: "reset-password",
};

const { TOKEN_KEY } = process.env;

/**
 * Middleware de autenticación con control de propósito y permisos por rol.
 *
 * @param {string[]} permissions - Lista de roles permitidos (opcional)
 * @param {string} purpose - Propósito esperado del token (opcional)
 * @returns {function} Middleware de Express
 */
const auth = (permissions, purpose) => {
  return (req, res, next) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Token de autenticación (Bearer) requerido." });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jsonwebtoken.verify(token, TOKEN_KEY);
      const { role, purpose: tokenPurpose } = decoded;

      req.user = decoded;

      const allowedRoles = Array.isArray(permissions)
        ? permissions
        : [permissions];

      if (permissions && !allowedRoles.includes(role)) {
        return res
          .status(403)
          .json({ message: "Acceso no autorizado para este rol." });
      }

      if (purpose && tokenPurpose !== purpose) {
        return res
          .status(403)
          .json({ message: "Acción no permitida por el propósito del token." });
      }

      return next();
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        return res.status(401).json({ message: "El token ha expirado." });
      }

      return res.status(401).json({ message: "Token inválido." });
    }
  };
};

export default auth;
