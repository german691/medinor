import mongoose from "mongoose";
import "dotenv/config";

const MONGODB_URI = process.env.MONGODB_URI;

const conn = mongoose.connect(MONGODB_URI);

export default conn;
