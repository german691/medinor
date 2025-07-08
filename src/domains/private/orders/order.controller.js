import asyncHandler from "express-async-handler";
import handleError from "../../../util/handleError";
import Client from "../client/client.model";
import { Counter } from "./counter.model";
import { Product } from "../product/product.model";
import { Order } from "./order.model";

export const addOrder = asyncHandler(async (req, res) => {
  const { clientId, items } = req.body;

  if (!clientId || !Array.isArray(items) || items.length === 0) {
    handleError("Datos incompletos o inválidos", 400);
  }

  const client = await Client.findById(clientId);
  if (!client) {
    handleError("Cliente no encontrado", 404);
  }

  const counter = await Counter.findByIdAndUpdate(
    { _id: "orderNumber" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  let total = 0;
  const orderItems = [];

  for (const item of items) {
    const { productId, quantity } = item;

    if (!productId || quantity <= 0) {
      continue;
    }

    const product = await Product.findById(productId);
    if (!product) {
      continue;
    }

    const price = product.price || 0;
    total += price * quantity;

    orderItems.push({
      product: product._id,
      quantity,
      price,
    });
  }

  if (orderItems.length === 0) {
    handleError("Ningún producto válido en la orden", 400);
  }

  const order = new Order({
    orderNumber: counter.seq,
    client: client._id,
    items: orderItems,
    total,
  });

  await order.save();

  res.status(201).json({ message: "Orden creada exitosamente", order });
});
