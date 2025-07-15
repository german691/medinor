import mongoose from "mongoose";
import { Roles } from "../../roles.js";

const clientSchema = new mongoose.Schema(
  {
    cod_client: { type: String, required: true, unique: true },
    razon_soci: { type: String, required: true },
    identiftri: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    active: { type: Boolean, default: false },
    must_change_password: { type: Boolean, default: true },
    role: { type: String, default: Roles.CLIENT },
  },
  {
    timestamps: true,
  }
);

const Client = mongoose.model("Client", clientSchema);

export default Client;
