import handleError from "../../../util/handleError.js";
import asyncHandler from "express-async-handler";
import { Category } from "./category.model.js";

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().lean();
  const mappedCategories = categories.map((c) => ({ category: c.name }));
  console.log(categories);
  res.status(200).json({ items: mappedCategories });
});

export const createCategories = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    handleError("No se proporcionó un nombre para la categoría", 400);
  }

  const cateogoryExists = await Category.findOne({ name: name });
  if (cateogoryExists) {
    handleError("Ya existe la categoría.", 409);
  }

  try {
    const newCategory = new Category({ name: name });
    await newCategory.save();

    const createdCategory = await Category.findById(newCategory._id);

    res.status(201).json({
      message: "Categoría creada correctamente.",
      category: createdCategory,
    });
  } catch (error) {
    handleError("Error interno del servidor al crear categoría.", 500);
  }
});
