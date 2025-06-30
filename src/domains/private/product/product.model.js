import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    notes: { type: String },
    lab: { type: mongoose.Schema.Types.ObjectId, ref: "Lab" },
    desc: { type: String },
    extra_desc: { type: String },
    iva: { type: Boolean, default: false },
    medinor_price: { type: Number },
    public_price: { type: Number },
    price: { type: Number },
    imageUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Product = mongoose.model("Product", productSchema);
