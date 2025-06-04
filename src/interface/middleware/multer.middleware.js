import multer from "multer";

const storage = multer.memoryStorage();

export const upload = (allowedMimes) => {
  return multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!allowedMimes.includes(file.mimetype)) {
        return cb(
          new Error(`Only ${allowedMimes.join(", ")} files are allowed`),
          false
        );
      }
      cb(null, true);
    },
  });
};
