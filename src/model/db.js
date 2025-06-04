import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import "dotenv/config";

const MONGODB_URI = process.env.MONGODB_URI;

const conn = mongoose.connect(MONGODB_URI);

let bucket;

mongoose.connection.once("open", () => {
  bucket = new GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });
  console.log("GridFS initialized");
});

export const getBucket = () => {
  if (!bucket) {
    throw new Error("GridFSBucket is not initialized yet.");
  }
  return bucket;
};

export default conn;
