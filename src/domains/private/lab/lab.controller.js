import { Lab } from "./lab.model.js";

export const getLabs = async (req, res) => {
  try {
    const labs = await Lab.find().lean();
    res.status(200).json({ items: labs });
  } catch (error) {
    console.error("Error al obtener laboratorios:", error);
    res.status(500).json({
      message: "Error interno del servidor al obtener laboratorios.",
      error: error.message,
    });
  }
};
