import { Product, Lab } from "./models.js"; // Asegúrate de que esta ruta sea correcta para tus modelos de Mongoose

// Función auxiliar para normalizar nombres de laboratorios
const normalizeLabName = (name) => {
  // Trim y Uppercase para consistencia, asumiendo que el nombre ya viene con los caracteres "corruptos" si los tuviera
  return name ? name.trim().toUpperCase() : null;
};

export const uploadProducts = async (req, res) => {
  try {
    const productsData = req.body;

    if (!Array.isArray(productsData) || productsData.length === 0) {
      return res.status(400).json({
        message: "No se encontraron datos de productos en la solicitud.",
      });
    }

    const labsToProcess = new Set();
    productsData.forEach((product) => {
      // Usamos el nombre exacto de la columna del CSV, incluyendo el carácter "Ã³"
      if (product["Laboratorio"]) {
        labsToProcess.add(normalizeLabName(product["Laboratorio"]));
      }
    });

    const newLabsCreated = [];
    const existingLabsMap = new Map();

    // --- 1. Procesar Laboratorios ---
    for (const labName of labsToProcess) {
      if (!labName) continue;

      let lab = await Lab.findOne({ name: labName });

      if (!lab) {
        lab = new Lab({ name: labName });
        await lab.save();
        newLabsCreated.push(lab.name);
        console.log(`Laboratorio creado: ${lab.name}`);
      }
      existingLabsMap.set(lab.name, lab._id);
    }

    // --- 2. Procesar Productos ---
    let productsCreatedCount = 0;
    let productsUpdatedCount = 0;
    const productsErrors = [];

    for (const productData of productsData) {
      try {
        const code = productData["Codigo"];
        const labNameFromCSV = normalizeLabName(productData["Laboratorio"]);
        const labId = existingLabsMap.get(labNameFromCSV);

        if (!code) {
          productsErrors.push({
            data: productData,
            error: "Campo 'Codigo' es requerido.",
          });
          continue;
        }

        let product = await Product.findOne({ code: code });

        const productFields = {
          code: code,
          notes: productData["Notas ArtÃ­culo"] || null,
          lab: labId,
          desc: productData["DescripciÃ³n"] || null,
          extra_desc: productData["DescripciÃ³n Adicional"] || null,
          iva: productData["Cod. IVA"] === "2" ? true : false,
          medinor_price:
            typeof productData["Pr. Medinor"] === "number"
              ? productData["Pr. Medinor"]
              : parseFloat(productData["Pr. Medinor"]) || 0,
          public_price:
            typeof productData["Pr. PÃºblico"] === "number"
              ? productData["Pr. PÃºblico"]
              : parseFloat(productData["Pr. PÃºblico"]) || 0,
          price:
            typeof productData["Pr. Costo"] === "number"
              ? productData["Pr. Costo"]
              : parseFloat(productData["Pr. Costo"]) || 0,
        };

        if (product) {
          Object.assign(product, productFields);
          await product.save();
          productsUpdatedCount++;
        } else {
          product = new Product(productFields);
          await product.save();
          productsCreatedCount++;
        }
      } catch (productError) {
        productsErrors.push({ data: productData, error: productError.message });
        console.error(
          `Error procesando producto con Codigo ${productData["Codigo"]}:`,
          productError
        );
      }
    }

    res.status(200).json({
      message: "Proceso de carga de productos completado.",
      labsSummary: {
        totalLabsProcessed: labsToProcess.size,
        newLabsCreated: newLabsCreated,
      },
      productsSummary: {
        productsCreated: productsCreatedCount,
        productsUpdated: productsUpdatedCount,
        productsWithErrors: productsErrors.length,
        errors: productsErrors,
      },
    });
  } catch (error) {
    console.error("Error general en el proceso de carga de productos:", error);
    res.status(500).json({
      message: "Error interno del servidor al procesar la carga.",
      error: error.message,
    });
  }
};
