const allowedTypes = ["afip", "licencia_municipal"];

const validateDocumentType = (req, res, next) => {
  if (!allowedTypes.includes(req.params.type)) {
    return res
      .status(400)
      .json({ error: `The parameter '${req.params.type}' is not allowed` });
  }
  next();
};

export default validateDocumentType;
