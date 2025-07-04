import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    desc: { type: String },
    extra_desc: { type: String },
    notes: { type: String },
    medinor_price: { type: Number },
    public_price: { type: Number },
    price: { type: Number },
    iva: { type: Boolean, default: false },
    listed: { type: Boolean, default: true },
    lab: { type: mongoose.Schema.Types.ObjectId, ref: "Lab" },
    imageUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Product = mongoose.model("Product", productSchema);
