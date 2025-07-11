import jsonwebtoken from "jsonwebtoken";

const { TOKEN_KEY } = process.env;

/** Middleware para verificación de tokens multipropósito
 * @param {string} reqPurpose - Propósito expreso en el payload del token
 * @returns {function} express middleware
 */
const action = (reqPurpose) => {
  return (req, res, next) => {
    const token = req.headers["x-action-token"];

    if (!token) {
      return res.status(401).send("Prohibido");
    }

    try {
      const decoded = jsonwebtoken.verify(token, TOKEN_KEY);
      if (decoded.purpose !== reqPurpose) {
        return res.status(403).json({
          message: `Acción no permitida. Se requiere propósito: '${reqPurpose}'.`,
        });
      }

      req.client = { id: decoded.sub };
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ message: "El token ha expirado." });
      }
      return res.status(401).json({ message: "Token inválido." });
    }
  };
};

export default action;
