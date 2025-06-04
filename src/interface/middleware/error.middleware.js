export const errorMiddleware = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";
  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
  });
};

export const joiErrorHandler = (error, req, res, next) => {
  if (error.isJoi) {
    return res.status(400).json({
      message: "Error de validación",
      details: error.details.map((detail) => detail.message),
    });
  }
  next(error);
};

export const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File size cannot exceed 2MB" });
    }
  }
  if (err.message === "Only PDF files are allowed") {
    return res.status(400).json({ error: err.message });
  }
  next(err);
};

export const endpointNotFound = (req, res) => {
  res.status(404).json({
    status: 404,
    message: "Endpoint not found, perhaps you're using the wrong method?",
    url: req.protocol + "://" + req.get("host") + req.originalUrl,
    body: req.body,
    params: req.params,
    method: req.method,
  });
};
