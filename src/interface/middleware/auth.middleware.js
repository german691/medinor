import jsonwebtoken from "jsonwebtoken";

const { TOKEN_KEY } = process.env;

const authentication = (roles) => {
  return (req, res, next) => {
    const token = req.headers["x-access-token"];

    if (!token) {
      return res.status(403).json({ message: "token not provided" });
    }

    try {
      const decodedToken = jsonwebtoken.verify(token, TOKEN_KEY);
      req.user = decodedToken;

      if (roles && ![].concat(roles).includes(req.user.role)) {
        return res.status(401).json({ message: "unauthorized" });
      }

      return next();
    } catch (error) {
      return res.status(401).json({ message: "invalid token" });
    }
  };
};

export default authentication;
