import mongoose from "mongoose";
import { Counter } from "./counter.model";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: Number, unique: true },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    items: [orderItemSchema],
    total: { type: Number, required: true },
  },
  { timestamps: true }
);

orderSchema.pre("save", async function (next) {
  const doc = this;

  if (doc.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "orderNumber" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      doc.orderNumber = counter.seq;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

export const Order = mongoose.model("Order", orderSchema);
