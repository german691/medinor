import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    cod_client: { type: String, required: true, unique: true },
    razon_soci: { type: String, required: true },
    identiftri: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    active: { type: Boolean, default: false },
    must_change_password: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const Client = mongoose.model("Client", clientSchema);

export default Client;
