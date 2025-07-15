import asyncHandler from "express-async-handler";
import { Category } from "./category.model.js";

/**
 * Obtiene un listado de todas las categorías almacenadas en la base de datos.
 * Mapea los resultados para devolver un formato simplificado con solo el nombre de la categoría.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un objeto con un array de categorías mapeadas.
 * @returns {Array<Object>} returns.items - Un array de objetos, donde cada objeto tiene la propiedad `category` con el nombre del laboratorio.
 * @returns {500} - Retorna un error interno del servidor si falla la consulta a la base de datos.
 */
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().lean();
  const mappedCategories = categories.map((c) => ({ category: c.name }));
  console.log(categories);
  res.status(200).json({ items: mappedCategories });
});

/**
 * Crea una nueva categoría en el sistema.
 *
 * - Valida que se proporcione un nombre para la categoría.
 * - Verifica si ya existe una categoría con el mismo nombre para evitar duplicados.
 * - Guarda la nueva categoría en la base de datos.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} req.body - El cuerpo de la solicitud.
 * @param {string} req.body.name - El nombre de la categoría a crear.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {201} - Retorna un mensaje de éxito y el objeto de la categoría recién creada.
 * @returns {400} - Retorna un error si no se proporciona el nombre de la categoría.
 * @returns {409} - Retorna un error si ya existe una categoría con el nombre proporcionado.
 * @returns {500} - Retorna un error interno del servidor si ocurre un problema durante la creación.
 */
export const createCategories = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res
      .status(400)
      .send("No se proporcionó un nombre para la categoría");
  }

  const cateogoryExists = await Category.findOne({ name: name });
  if (cateogoryExists) {
    return res.status(409).send("Ya existe la categoría.");
  }

  try {
    const newCategory = new Category({ name: name });
    await newCategory.save();

    const createdCategory = await Category.findById(newCategory._id);

    return res.status(201).json({
      message: "Categoría creada correctamente.",
      category: createdCategory,
    });
  } catch (error) {
    res.status(500).send("Error interno del servidor al crear categoría.");
  }
});
