import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    cod_client: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    razon_soci: { type: String, required: true },
    identiftri: { type: String, required: true },
    password: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
