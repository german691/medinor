import jsonwebtoken from "jsonwebtoken";

const { TOKEN_KEY, TOKEN_EXPIRY } = process.env;

const createToken = async (
  payload,
  key = TOKEN_KEY,
  expiresIn = TOKEN_EXPIRY || "72h"
) => {
  try {
    const token = jsonwebtoken.sign(payload, key, {
      expiresIn,
    });
    return token;
  } catch (error) {
    throw error;
  }
};

export const PURPOSES = {
  resetPwd: "reset-password",
};

/**
 * Genera un token jwt multipropósito
 * @param {string} clientId - id de cliente
 * @param {string} purpose - razón del token, ej. reset password
 * @param {string} expiresIn - expiración del token
 * @returns {string} - token jwt firmado
 */
export const createActionToken = ({
  clientId,
  purpose = PURPOSES.resetPwd,
  expiresIn = "1h",
}) => {
  const payload = {
    sub: clientId,
    purpose: purpose,
  };

  const secretKey = process.env.TOKEN_KEY;

  return jwt.sign(payload, secretKey, { expiresIn });
};

export default createToken;
