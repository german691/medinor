import mongoose from "mongoose";
import { Roles } from "../../roles.js";

const { Schema } = mongoose;

const AdminSchema = new Schema(
  {
    username: { type: String, unique: true, required: true },
    fullName: { type: String, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(Roles),
      required: true,
      default: Roles.ADMIN,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Admin = mongoose.model("Admin", AdminSchema);

export { AdminSchema, Admin };
