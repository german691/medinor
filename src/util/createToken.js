import jsonwebtoken from "jsonwebtoken";

const { TOKEN_KEY, TOKEN_EXPIRY } = process.env;

/**
 * Crea un token JWT con los datos necesarios para el middleware de autenticación.
 *
 * @param {object} payload
 * @param {string} [key]
 * @param {string} [expiresIn]
 * @returns {Promise<string>} <- token
 */
export const createToken = async ({
  payload,
  key = TOKEN_KEY,
  expiresIn = TOKEN_EXPIRY || "72h",
}) => {
  try {
    const token = jsonwebtoken.sign(payload, key, {
      expiresIn,
    });
    return token;
  } catch (error) {
    throw error;
  }
};
