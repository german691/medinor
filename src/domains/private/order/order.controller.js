import asyncHandler from "express-async-handler";
import Client from "../client/client.model.js";
import { Product } from "../product/product.model.js";
import { Order } from "./order.model.js";
import { Roles } from "../../roles.js";

/**
 * Calcula los valores de descuento y precios finales para un producto.
 *
 * @param {Object} product - El objeto producto con sus precios.
 * @param {number} product.price - El precio base del producto.
 * @param {number} [product.medinor_price] - Precio de Medinor (usado para calcular descuento).
 * @param {number} [product.public_price] - Precio público (usado para calcular descuento).
 * @returns {Object} Un objeto con el precio base, precio con descuento aplicado y el monto del descuento.
 * @returns {number} returns.price - El precio base original del producto.
 * @returns {number} returns.priceDiscount - El precio del producto después de aplicar el descuento.
 * @returns {number} returns.discountAmount - El monto total del descuento aplicado al producto.
 */
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

/**
 * Agrega una nueva orden al sistema.
 *
 * - Requiere un array de ítems de producto válidos y un ID de cliente (del token).
 * - Valida la existencia del cliente y de cada producto individualmente.
 * - Calcula los totales (bruto, con descuento, monto de descuento) de la orden.
 * - Guarda la nueva orden en la base de datos.
 *
 * @body {Object} req.body - El cuerpo de la solicitud que contiene los ítems de la orden.
 * @body {Array<Object>} req.body.items - Un array de objetos, donde cada objeto contiene `productId` y `quantity`.
 * @returns {201} - Retorna la orden creada con un mensaje de éxito.
 * @returns {400} - Retorna un error si los datos son incompletos/inválidos o si no hay productos válidos en la orden.
 * @returns {404} - Retorna un error si el cliente asociado a la orden no es encontrado.
 */
export const addOrder = asyncHandler(async (req, res) => {
  const { items } = req.body;
  const { id } = req.user;

  if (!id || !Array.isArray(items) || items.length === 0) {
    res.status(400).send("Datos incompletos o inválidos");
  }

  const client = await Client.findById(id);
  if (!client) {
    res.status(404).send("Cliente no encontrado");
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
    res.status(400).send("Ningún producto válido en la orden");
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

/**
 * Obtiene un listado paginado de órdenes de pedido.
 *
 * - Admite filtros, paginación y ordenamiento.
 * - Los clientes solo pueden ver sus propias órdenes.
 * - Administradores y Superadministradores pueden ver todas las órdenes.
 *
 * @body {Object} [req.body] - Parámetros para la búsqueda y paginación.
 * @body {number} [req.body.page=1] - Número de página.
 * @body {number} [req.body.limit=25] - Cantidad de órdenes por página.
 * @body {Object} [req.body.filters={}] - Objeto con los criterios de filtrado.
 * @body {Object} [req.body.sort={}] - Objeto con el campo y la dirección de ordenamiento.
 * @returns {200} - Retorna un objeto con las órdenes, información de paginación y el total de ítems.
 * @returns {500} - Retorna un error si ocurre un problema interno del servidor al consultar las órdenes.
 */
export const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 25, filters = {}, sort = {} } = req.body;
  const { role, id } = req.user;

  const pageNumber = parseInt(page);
  const pageSize = parseInt(limit);

  const skip = (pageNumber - 1) * pageSize;

  const sortObj = {};
  if (sort?.key && sort?.direction) {
    sortObj[sort.key] = sort.direction;
  }

  let queryFilters = { ...filters };

  if (role === Roles.CLIENT) {
    queryFilters.client = id;
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
    const total = await Order.countDocuments(queryFilters);

    const orders = await Order.find(queryFilters)
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
    res
      .status(500)
      .send("Error interno del servidor al obtener órdenes de pedidos.");
  }
});
