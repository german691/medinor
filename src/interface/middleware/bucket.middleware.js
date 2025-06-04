import { getBucket } from "../../config/db.js";

export const addBucketToRequest = (req, res, next) => {
  try {
    req.bucket = getBucket();
    next();
  } catch (error) {
    next(error);
  }
};
