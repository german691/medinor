export const errorMiddleware = (error, req, res, next) => {
  console.error(error);

  if (error.isJoi) {
    return res.status(400).json({
      status: 400,
      message: "Error en la validación de datos.",
      details: error.details.map((detail) => detail.message.replace(/"/g, "'")),
    });
  }

  const statusCode = error.status || error.statusCode || 500;

  return res.status(statusCode).json({
    status: statusCode,
    message: error.message || "Error interno del servidor",
  });
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

// export const multerErrorHandler = (err, req, res, next) => {
//   if (err instanceof multer.MulterError) {
//     if (err.code === "LIMIT_FILE_SIZE") {
//       return res.status(400).json({ error: "File size cannot exceed 2MB" });
//     }
//   }
//   if (err.message === "Only PDF files are allowed") {
//     return res.status(400).json({ error: err.message });
//   }
//   next(err);
// };
