import { Lab } from "../lab/lab.model.js";
import { Product } from "./product.model.js";
import mongoose from "mongoose";

const normalizeLabName = (name) => {
  return name ? String(name).trim().toUpperCase() : null;
};

/**
 * Endpoint para analizar los datos de productos cargados.
 * - Verifica y crea laboratorios si no existen.
 * - Clasifica los productos en nuevos, existentes, con conflictos o inválidos.
 * - Devuelve un resumen para que el frontend lo revise.
 * @param {express.Request} req - La solicitud HTTP (espera { products: RawProductRecord[] } en el body).
 * @param {express.Response} res - La respuesta HTTP.
 */
export const analyzeProducts = async (req, res) => {
  const { products: productsData } = req.body;

  if (!Array.isArray(productsData) || productsData.length === 0) {
    return res.status(400).json({
      message:
        "No se encontraron datos de productos en la solicitud o el formato es incorrecto (debe ser un array en 'products').",
    });
  }

  // Calculate total filtered out right at the start
  const productsToAnalyze = productsData.filter((product) => {
    const labName = normalizeLabName(product.lab);
    return labName !== "BAJA";
  });

  const totalFilteredOut = productsData.length - productsToAnalyze.length;

  // If after filtering, no products remain to analyze
  if (productsToAnalyze.length === 0) {
    return res.status(200).json({
      message:
        totalFilteredOut > 0
          ? `Análisis completado. ${totalFilteredOut} productos fueron omitidos porque su laboratorio era 'BAJA'. No quedan productos válidos para analizar.`
          : "Análisis completado. No se encontraron productos válidos para analizar o el archivo estaba vacío.",
      summary: {
        totalReceived: productsData.length,
        totalValid: 0,
        totalInvalid: 0,
        totalNew: 0,
        totalCurrent: 0,
        totalConflicts: 0,
        totalFilteredOut: totalFilteredOut, // Added here
      },
      data: {
        newProducts: [],
        currentProducts: [],
        conflictingProducts: [],
        invalidRows: [],
        productsReadyForMigration: [],
      },
    });
  }

  const labsMap = new Map();
  const labNamesMap = new Map();
  const newLabsCreated = [];
  const productsWithErrors = [];

  const newProductsForFrontend = [];
  const currentProductsForFrontend = [];
  const conflictingProductsForFrontend = [];

  const newProductsForMigration = [];

  // --- 1. Procesar y asegurar la existencia de Laboratorios ---
  const uniqueLabNames = new Set(
    productsToAnalyze.map((p) => normalizeLabName(p.lab)).filter(Boolean)
  );

  for (const labName of uniqueLabNames) {
    try {
      let lab = await Lab.findOne({ name: labName });
      if (!lab) {
        lab = new Lab({ name: labName });
        await lab.save();
        newLabsCreated.push(lab.name);
      }
      labsMap.set(lab.name, lab._id);
      labNamesMap.set(lab._id.toString(), lab.name);
    } catch (labError) {
      console.error(`Error al procesar laboratorio ${labName}:`, labError);
    }
  }

  // --- 2. Analizar y Clasificar Productos ---
  for (const productData of productsToAnalyze) {
    try {
      const code = String(productData.code || "").trim();
      const labNameFromCsv = normalizeLabName(productData.lab);
      const labId = labsMap.get(labNameFromCsv);

      if (!code) {
        productsWithErrors.push({
          data: productData,
          errors: ["El código del producto es requerido."],
        });
        continue;
      }
      if (!labId) {
        productsWithErrors.push({
          data: productData,
          errors: [
            `Laboratorio '${productData.lab}' no encontrado o no pudo ser creado.`,
          ],
        });
        continue;
      }
      if (!productData.desc) {
        productsWithErrors.push({
          data: productData,
          errors: ["La descripción del producto es requerida."],
        });
        continue;
      }

      const productToProcess = {
        code: code,
        notes: productData.notes || null,
        lab: labId,
        desc: productData.desc || null,
        extra_desc: productData.extra_desc || null,
        iva: productData.iva,
        medinor_price: parseFloat(productData.medinor_price) || 0,
        public_price: parseFloat(productData.public_price) || 0,
        price: parseFloat(productData.price) || 0,
        imageUrl: productData.imageUrl || null,
      };

      const existingProduct = await Product.findOne({ code: code });

      if (existingProduct) {
        if (
          existingProduct.desc !== productToProcess.desc ||
          !existingProduct.lab.equals(labId)
        ) {
          conflictingProductsForFrontend.push({
            ...productData,
            lab:
              labNamesMap.get(existingProduct.lab.toString()) ||
              productData.lab,
            conflictReason: `Producto con código '${code}' ya existe con descripción o laboratorio diferente.`,
          });
        } else {
          currentProductsForFrontend.push({
            ...productData,
            lab:
              labNamesMap.get(existingProduct.lab.toString()) ||
              productData.lab,
          });
        }
      } else {
        newProductsForMigration.push(productToProcess);

        newProductsForFrontend.push({
          ...productToProcess,
          lab: labNameFromCsv,
          labObjectId: labId.toString(),
        });
      }
    } catch (productAnalysisError) {
      productsWithErrors.push({
        data: productData,
        errors: [
          `Error interno al analizar el producto: ${productAnalysisError.message}`,
        ],
      });
      console.error(
        `Error analizando producto con código ${productData.code}:`,
        productAnalysisError
      );
    }
  }

  res.status(200).json({
    message:
      "Análisis de productos completado. Revise los resultados antes de confirmar la migración.",
    summary: {
      totalReceived: productsData.length,
      totalValid:
        newProductsForFrontend.length + currentProductsForFrontend.length,
      totalInvalid: productsWithErrors.length,
      totalNew: newProductsForFrontend.length,
      totalCurrent: currentProductsForFrontend.length,
      totalConflicts: conflictingProductsForFrontend.length,
      totalFilteredOut: totalFilteredOut, // Added here
    },
    data: {
      newProducts: newProductsForFrontend,
      currentProducts: currentProductsForFrontend,
      conflictingProducts: conflictingProductsForFrontend,
      invalidRows: productsWithErrors,
      productsReadyForMigration: newProductsForMigration,
    },
  });
};

/**
 * Endpoint para confirmar y ejecutar la migración de productos.
 * - Recibe el array de productos "nuevos" listos para ser creados (ya con ObjectId de lab).
 * - Realiza la creación masiva en la DB.
 * @param {express.Request} req - La solicitud HTTP (espera { newProducts: RawProductRecord[] } en el body).
 * @param {express.Response} res - La respuesta HTTP.
 */
export const confirmProductMigration = async (req, res) => {
  // IMPORTANT: Now we expect `productsToMigrate` from the frontend,
  // which should be the array with lab ObjectIds.
  const { productsToMigrate } = req.body;

  if (!Array.isArray(productsToMigrate) || productsToMigrate.length === 0) {
    return res
      .status(400)
      .json({ message: "No se encontraron productos válidos para migrar." });
  }

  let createdCount = 0;
  const migrationErrors = [];

  try {
    for (const productData of productsToMigrate) {
      // Use productsToMigrate here
      try {
        if (
          !productData.lab ||
          !mongoose.Types.ObjectId.isValid(productData.lab)
        ) {
          migrationErrors.push({
            data: productData,
            error: "ID de laboratorio inválido antes de la creación.",
          });
          continue;
        }

        const newProduct = new Product(productData);
        await newProduct.save();
        createdCount++;
      } catch (insertError) {
        migrationErrors.push({
          data: productData,
          error: `Error al insertar producto con código ${productData.code}: ${insertError.message}`,
        });
        console.error(
          `Error insertando producto ${productData.code}:`,
          insertError
        );
      }
    }

    res.status(200).json({
      message: "Migración de productos completada exitosamente.",
      data: {
        createdCount: createdCount,
        migrationErrors: migrationErrors,
      },
    });
  } catch (error) {
    console.error("Error general durante la migración de productos:", error);
    res.status(500).json({
      message: "Error interno del servidor al ejecutar la migración.",
      error: error.message,
      migrationErrors: migrationErrors,
    });
  }
};

// --- CRUD ENDPOINTS PARA GESTION DE UN SOLO PRODUCTO ---

/**
 * Endpoint para obtener una lista de todos los productos.
 * Puede incluir opciones de paginación, filtro o búsqueda en el futuro.
 * @param {express.Request} req - La solicitud HTTP.
 * @param {express.Response} res - La respuesta HTTP.
 */
export const getProducts = async (req, res) => {
  try {
    // .populate('lab') para obtener el objeto completo del laboratorio referenciado
    // .lean() para convertir el documento de Mongoose en un objeto JS plano, más rápido para lectura
    const products = await Product.find().populate("lab").lean();

    // Mapear el `lab` de ObjectId a su `name` para el frontend
    // y añadir `_id` para el `getRowId` del frontend
    const formattedProducts = products.map((p) => ({
      ...p,
      id: p._id.toString(), // DataGrid necesita 'id' como string
      lab: p.lab ? p.lab.name : "N/A", // Si 'lab' está populado, toma el nombre
      labObjectId: p.lab ? p.lab._id.toString() : null, // También el ObjectId para el modal de edición
      // Asegurarse de que las fechas sean formateadas como strings si es necesario
      createdAt: p.createdAt ? p.createdAt.toISOString() : null,
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null,
    }));

    res.status(200).json({ items: formattedProducts }); // Envía los productos en una propiedad 'items'
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({
      message: "Error interno del servidor al obtener productos.",
      error: error.message,
    });
  }
};

/**
 * Endpoint para obtener un solo producto por su ID.
 * @param {express.Request} req - La solicitud HTTP (req.params.id).
 * @param {express.Response} res - La respuesta HTTP.
 */
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de producto inválido." });
    }

    const product = await Product.findById(id).populate("lab").lean();

    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    // Formatear el producto para el frontend si es necesario
    const formattedProduct = {
      ...product,
      id: product._id.toString(),
      lab: product.lab ? product.lab.name : "N/A",
      labObjectId: product.lab ? product.lab._id.toString() : null,
      createdAt: product.createdAt ? product.createdAt.toISOString() : null,
      updatedAt: product.updatedAt ? product.updatedAt.toISOString() : null,
    };

    res.status(200).json({ product: formattedProduct });
  } catch (error) {
    console.error(`Error al obtener producto con ID ${req.params.id}:`, error);
    res.status(500).json({
      message: "Error interno del servidor al obtener el producto.",
      error: error.message,
    });
  }
};

/**
 * Endpoint para crear un nuevo producto individual.
 * @param {express.Request} req - La solicitud HTTP (espera datos del producto en el body).
 * @param {express.Response} res - La respuesta HTTP.
 */
export const createProduct = async (req, res) => {
  try {
    const {
      code,
      notes,
      lab,
      desc,
      extra_desc,
      iva,
      medinor_price,
      public_price,
      price,
      imageUrl,
    } = req.body;

    // Validaciones básicas
    if (!code || !desc || !lab) {
      return res.status(400).json({
        message:
          "Código, descripción y ID de laboratorio son campos requeridos.",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(lab)) {
      return res
        .status(400)
        .json({ message: "ID de laboratorio proporcionado no es válido." });
    }

    // Verificar si ya existe un producto con el mismo código
    const existingProduct = await Product.findOne({ code: code });
    if (existingProduct) {
      return res
        .status(409)
        .json({ message: `Ya existe un producto con el código '${code}'.` });
    }

    const newProduct = new Product({
      code,
      notes,
      lab,
      desc,
      extra_desc,
      iva,
      medinor_price,
      public_price,
      price,
      imageUrl,
    });
    await newProduct.save();

    // Después de guardar, poblamos el lab para devolver el nombre al frontend
    const createdProduct = await Product.findById(newProduct._id)
      .populate("lab")
      .lean();
    const formattedCreatedProduct = {
      ...createdProduct,
      id: createdProduct._id.toString(),
      lab: createdProduct.lab ? createdProduct.lab.name : "N/A",
      labObjectId: createdProduct.lab
        ? createdProduct.lab._id.toString()
        : null,
      createdAt: createdProduct.createdAt
        ? createdProduct.createdAt.toISOString()
        : null,
      updatedAt: createdProduct.updatedAt
        ? createdProduct.updatedAt.toISOString()
        : null,
    };

    res.status(201).json({
      message: "Producto creado exitosamente.",
      product: formattedCreatedProduct,
    });
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({
      message: "Error interno del servidor al crear el producto.",
      error: error.message,
    });
  }
};

/**
 * Endpoint para actualizar un producto existente por su ID.
 * @param {express.Request} req - La solicitud HTTP (req.params.id, datos del producto en el body).
 * @param {express.Response} res - La respuesta HTTP.
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      notes,
      lab,
      desc,
      extra_desc,
      iva,
      medinor_price,
      public_price,
      price,
      imageUrl,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de producto inválido." });
    }
    if (!mongoose.Types.ObjectId.isValid(lab)) {
      return res
        .status(400)
        .json({ message: "ID de laboratorio proporcionado no es válido." });
    }

    // Opcional: Validar que el nuevo código no esté en uso por otro producto si se permite cambiar el código
    if (code) {
      // Si el código se está enviando para actualización
      const productWithSameCode = await Product.findOne({ code: code });
      if (productWithSameCode && productWithSameCode._id.toString() !== id) {
        return res.status(409).json({
          message: `El código '${code}' ya está en uso por otro producto.`,
        });
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        code,
        notes,
        lab,
        desc,
        extra_desc,
        iva,
        medinor_price,
        public_price,
        price,
        imageUrl,
      },
      { new: true, runValidators: true } // `new: true` para devolver el doc actualizado, `runValidators: true` para ejecutar validadores del esquema
    )
      .populate("lab")
      .lean();

    if (!updatedProduct) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    // Formatear el producto actualizado para el frontend
    const formattedUpdatedProduct = {
      ...updatedProduct,
      id: updatedProduct._id.toString(),
      lab: updatedProduct.lab ? updatedProduct.lab.name : "N/A",
      labObjectId: updatedProduct.lab
        ? updatedProduct.lab._id.toString()
        : null,
      createdAt: updatedProduct.createdAt
        ? updatedProduct.createdAt.toISOString()
        : null,
      updatedAt: updatedProduct.updatedAt
        ? updatedProduct.updatedAt.toISOString()
        : null,
    };

    res.status(200).json({
      message: "Producto actualizado exitosamente.",
      product: formattedUpdatedProduct,
    });
  } catch (error) {
    console.error(
      `Error al actualizar producto con ID ${req.params.id}:`,
      error
    );
    // Mongoose duplicate key error (code: 11000)
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Ya existe un producto con el código proporcionado.",
      });
    }
    res.status(500).json({
      message: "Error interno del servidor al actualizar el producto.",
      error: error.message,
    });
  }
};

/**
 * Endpoint para eliminar un producto existente por su ID.
 * @param {express.Request} req - La solicitud HTTP (req.params.id).
 * @param {express.Response} res - La respuesta HTTP.
 */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de producto inválido." });
    }

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    res.status(200).json({ message: "Producto eliminado exitosamente." });
  } catch (error) {
    console.error(`Error al eliminar producto con ID ${req.params.id}:`, error);
    res.status(500).json({
      message: "Error interno del servidor al eliminar el producto.",
      error: error.message,
    });
  }
};
