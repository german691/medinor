import asyncHandler from "express-async-handler";
import handleError from "../../../util/handleError.js";
import Client from "../client/client.model.js";
import { Product } from "../product/product.model.js";
import { Order } from "./order.model.js";

function getDiscountValues(product) {
  const price = product.price || 0;
  let discount = 0;

  if (
    product.medinor_price != null &&
    product.public_price != null &&
    product.public_price !== 0
  ) {
    discount = product.medinor_price / product.public_price - 1;
  }

  const priceDiscount = price * (1 + discount);
  const discountAmount = price * Math.abs(discount);

  return { price, priceDiscount, discountAmount };
}

export const addOrder = asyncHandler(async (req, res) => {
  const { clientId, items } = req.body;

  if (!clientId || !Array.isArray(items) || items.length === 0) {
    handleError("Datos incompletos o inválidos", 400);
  }

  const client = await Client.findById(clientId);
  if (!client) {
    handleError("Cliente no encontrado", 404);
  }

  let total = 0;
  let totalWithDiscount = 0;
  let totalDiscountAmount = 0;

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

    const { price, priceDiscount, discountAmount } = getDiscountValues(product);

    total += price * quantity;
    totalWithDiscount += priceDiscount * quantity;
    totalDiscountAmount += discountAmount * quantity;

    orderItems.push({
      product: product._id,
      quantity,
      price,
      priceDiscount,
      discountAmount,
    });
  }

  if (orderItems.length === 0) {
    handleError("Ningún producto válido en la orden", 400);
  }

  const order = new Order({
    client: client._id,
    items: orderItems,
    total,
    totalWithDiscount,
    totalDiscountAmount,
  });

  await order.save();

  res.status(201).json({ message: "Orden creada exitosamente", order });
});

export const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 25, filters = {}, sort = {} } = req.body;

  const pageNumber = parseInt(page);
  const pageSize = parseItn(limit);

  const skip = (pageNumber - 1) * pageSize;

  const sortObj = {};
  if (sort?.key && sort?.direction) {
    sortObj[sort.key] = sort.direction;
  }

  // const searchableFields = [
  // ... futura lógica para buscar por X campos
  // ]
  //
  // let searchFilter = {};
  // if (search) {
  //   searchFilter = {
  //     $or: searchableFields.map((field) => ({
  //       [field]: { $regex: search, $options: "i" },
  //     })),
  //   };
  // }
  //
  // const finalFilters = {
  //   ...filters,
  //   ...(search ? searchFilter : {}),
  // };

  try {
    const total = await Order.countDocuments(filters);

    const orders = await Order.find(filters)
      .sort(sortObj)
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalPages = Math.ceil(total / pageSize);

    res.status(200).json({
      page: pageNumber,
      totalPages,
      totalItems: total,
      items: orders,
    });
  } catch (error) {
    console.error("Error al obtener órdenes de pedidos:", error);
    handleError(
      "Error interno del servidor al obtener órdenes de pedidos.",
      500
    );
  }
});
