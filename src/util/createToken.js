import jsonwebtoken from "jsonwebtoken";

const { TOKEN_KEY, TOKEN_EXPIRY } = process.env;

const createToken = async (
  payload,
  key = TOKEN_KEY,
  expiresIn = TOKEN_EXPIRY
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

export default createToken;
