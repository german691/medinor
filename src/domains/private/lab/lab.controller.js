import handleError from "../../../util/handleError.js";
import asyncHandler from "express-async-handler";
import { Lab } from "./lab.model.js";

export const getLabs = asyncHandler(async (req, res) => {
  const labs = await Lab.find().lean();
  const mappedLabs = labs.map((l) => ({ lab: l.name }));
  res.status(200).json({ items: mappedLabs });
});

export const createLab = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    handleError("No se proporcionó un nombre para el laboratorio", 400);
  }

  const labExists = await Lab.findOne({ name: name });
  if (labExists) {
    handleError("Ya existe el laboratorio.", 409);
  }

  try {
    const newLab = new Lab({ name: name });
    await newLab.save();

    const createdLab = await Lab.findById(newLab._id);

    res
      .status(201)
      .json({ message: "Laboratorio creado correctamente.", lab: createdLab });
  } catch (error) {
    handleError("Error interno del servidor al crear laboratorio.", 500);
  }
});
