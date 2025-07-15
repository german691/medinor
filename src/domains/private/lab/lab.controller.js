import asyncHandler from "express-async-handler";
import { Lab } from "./lab.model.js";
import createError from "http-errors";

/**
 * Obtiene un listado de todos los laboratorios almacenados en la base de datos.
 *
 * @returns {200} - Retorna un objeto con un array de laboratorios mapeados.
 * @returns {Array<Object>} returns.items - Un array de objetos, donde cada objeto tiene la propiedad `lab` con el nombre del laboratorio.
 */
export const getLabs = asyncHandler(async (req, res) => {
  const labs = await Lab.find().lean();
  const mappedLabs = labs.map((l) => ({ lab: l.name }));
  res.status(200).json({ items: mappedLabs });
});

/**
 * Crea un nuevo laboratorio en el sistema.
 *
 * - Valida que se proporcione un nombre para el laboratorio.
 * - Verifica si ya existe un laboratorio con el mismo nombre para evitar duplicados.
 * - Guarda el nuevo laboratorio en la base de datos.
 *
 * @body {Object} req.body - El cuerpo de la solicitud.
 * @body {string} req.body.name - El nombre del laboratorio a crear.
 * @returns {201} - Retorna un mensaje de éxito y el objeto del laboratorio recién creado.
 * @returns {400} - Retorna un error si no se proporciona el nombre del laboratorio.
 * @returns {409} - Retorna un error si ya existe un laboratorio con el nombre proporcionado.
 * @returns {500} - Retorna un error si ocurre un problema interno del servidor durante la creación.
 */
export const createLab = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    throw createError(400, "No se proporcionó un nombre para el laboratorio");
  }

  const labExists = await Lab.findOne({ name: name });
  if (labExists) {
    throw createError(409, "Ya existe el laboratorio.");
  }

  try {
    const newLab = new Lab({ name: name });
    await newLab.save();

    const createdLab = await Lab.findById(newLab._id);

    res
      .status(201)
      .json({ message: "Laboratorio creado correctamente.", lab: createdLab });
  } catch (error) {
    console.log(error);
    throw error;
  }
});
