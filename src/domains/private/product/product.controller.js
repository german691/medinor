import { Lab } from "../lab/lab.model.js";
import { Product } from "./product.model.js";
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import handleError from "../../../util/handleError.js";

const normalizeLabName = (name) => {
  return name ? String(name).trim().toUpperCase() : null;
};

/**
 * @desc   Endpoint para analizar los datos de productos cargados.
 *         - Verifica y crea laboratorios si no existen.
 *         - Clasifica los productos en nuevos, existentes, con conflictos o inválidos.
 *         - Devuelve un resumen para que el frontend lo revise.
 * @route  POST /api/products/analyze
 * @access Private
 */
export const analyzeProducts = asyncHandler(async (req, res) => {
  const { products: productsData } = req.body;

  if (!Array.isArray(productsData) || productsData.length === 0) {
    handleError(
      "No se encontraron datos de productos en la solicitud o el formato es incorrecto (debe ser un array en 'products').",
      400
    );
  }

  const productsToAnalyze = productsData.filter((product) => {
    const labName = normalizeLabName(product.lab);
    return labName !== "BAJA";
  });

  const totalFilteredOut = productsData.length - productsToAnalyze.length;

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
        totalFilteredOut: totalFilteredOut,
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
      totalFilteredOut: totalFilteredOut,
    },
    data: {
      newProducts: newProductsForFrontend,
      currentProducts: currentProductsForFrontend,
      conflictingProducts: conflictingProductsForFrontend,
      invalidRows: productsWithErrors,
      productsReadyForMigration: newProductsForMigration,
    },
  });
});

/**
 * @desc Endpoint para confirmar y ejecutar la migración de productos.
 * @route POST /api/products/make-migration
 * @access  Private
 */
export const confirmProductMigration = asyncHandler(async (req, res) => {
  const { productsToMigrate } = req.body;

  if (!Array.isArray(productsToMigrate) || productsToMigrate.length === 0) {
    handleError("No se encontraron productos válidos para migrar.", 400);
  }

  let createdCount = 0;
  const migrationErrors = [];

  try {
    for (const productData of productsToMigrate) {
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
    handleError("Error interno del servidor al ejecutar la migración", 500, {
      migrationErrors: migrationErrors,
    });
  }
});

/**
 * @desc Obtener productos paginados con posibilidad de búsqueda.
 * @route GET /api/products
 * @access Public
 */
export const getProducts = asyncHandler(async (req, res) => {
  console.log(req.body);
  const {
    page = 1,
    limit = 25,
    filters = {},
    sort = {},
    search = "",
  } = req.body;

  const pageNumber = parseInt(page);
  const pageSize = parseInt(limit);

  const skip = (pageNumber - 1) * pageSize;

  const sortObj = {};
  if (sort?.key && sort?.direction) {
    sortObj[sort.key] = sort.direction;
  }

  const searchableFields = ["code", "notes", "desc", "extra_desc"];

  let searchFilter = {};
  if (search) {
    const matchingLabs = await Lab.find({
      name: { $regex: search, $options: "i" },
    }).select("_id");

    const labIds = matchingLabs.map((lab) => lab._id);

    searchFilter = {
      $or: [
        ...searchableFields.map((field) => ({
          [field]: { $regex: search, $options: "i" },
        })),
        { lab: { $in: labIds } },
      ],
    };
  }

  const finalFilters = {
    ...filters,
    ...(search ? searchFilter : {}),
  };

  try {
    const total = await Product.countDocuments(finalFilters);

    const products = await Product.find(finalFilters)
      .sort(sortObj)
      .skip(skip)
      .limit(pageSize)
      .populate("lab")
      .lean();

    const formattedProducts = products.map((p) => ({
      ...p,
      id: p._id.toString(),
      lab: p.lab.name,
    }));

    const totalPages = Math.ceil(total / pageSize);

    res.status(200).json({
      page: pageNumber,
      totalPages,
      totalItems: total,
      items: formattedProducts,
    });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    handleError("Error interno del servidor al obtener productos.", 500);
  }
});

/**
 * @desc Endpoint para obtener un solo producto por su ID.
 * @route GET /api/products/:id
 * @access Public
 */
export const getProductById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      handleError("ID de producto inválido.", 400);
    }
    const product = await Product.findById(id).populate("lab").lean();
    if (!product) {
      handleError("Producto no encontrado.", 400);
    }
    const formattedProduct = {
      ...product,
      id: product._id.toString(),
      lab: product.lab,
    };
    res.status(200).json({ product: formattedProduct });
  } catch (error) {
    console.error(`Error al obtener producto con ID ${req.params.id}:`, error);
    handleError("Error interno del servidor al obtener productos.", 500);
  }
});

/**
 * @desc Endpoint para crear un nuevo producto individual.
 * @route POST /api/products
 * @access Private
 */
export const createProduct = asyncHandler(async (req, res) => {
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
    } = req.body;

    console.log(req.body);

    if (!code || !desc || !lab) {
      handleError(
        "Código, descripción y ID de laboratorio son campos requeridos.",
        400
      );
    }

    // LOGICA ANTIGUA
    // esto antes usaba la ID de lab, pero ahora el front pasa el nombre
    // if (!mongoose.Types.ObjectId.isValid(lab)) {
    //   handleError("ID de laboratorio proporcionado no es válido.", 400);
    // }

    const labIsValid = await Lab.findOne({ name: lab });
    if (!labIsValid) {
      handleError(`No se proporcionó un nombre de laboratorio válido'.`, 400);
    }

    const labId = labIsValid._id;

    const existingProduct = await Product.findOne({ code: code });
    if (existingProduct) {
      handleError(`Ya existe un producto con el código '${code}'.`, 409);
    }

    const newProduct = new Product({
      code,
      notes,
      lab: labId,
      desc,
      extra_desc,
      iva,
      medinor_price,
      public_price,
      price,
      // imageUrl,
    });
    await newProduct.save();

    const createdProduct = await Product.findById(newProduct._id)
      .populate("lab")
      .lean();
    const formattedCreatedProduct = {
      ...createdProduct,
      id: createdProduct._id.toString(),
      lab: createdProduct.lab,
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
    handleError("Error interno del servidor al crear producto.", 500);
  }
});

/**
 * @desc Endpoint para actualizar un producto existente por su ID.
 * @route PUT /api/products
 * @access Private
 */
export const updateProduct = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { code, lab } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      handleError("ID de producto inválido.", 400);
    }
    if (!mongoose.Types.ObjectId.isValid(lab)) {
      handleError("ID de laboratorio proporcionado no es válido.", 400);
    }

    if (code) {
      const productWithSameCode = await Product.findOne({ code: code });
      if (productWithSameCode && productWithSameCode._id.toString() !== id) {
        handleError(
          `El código '${code}' ya está en uso por otro producto.`,
          409
        );
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("lab")
      .lean();

    if (!updatedProduct) {
      handleError("Producto no encontrado.", 404);
    }

    const formattedUpdatedProduct = {
      ...updatedProduct,
      id: updatedProduct._id.toString(),
      lab: updatedProduct.lab,
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
    if (error.code === 11000) {
      handleError("Ya existe un producto con el código proporcionado.", 409);
    }
    handleError("Error interno del servidor al actualizar el producto.", 500);
  }
});

/**
 * @desc    Actualiza múltiples productos.
 * @route   PUT /api/products/bulk-update
 * @access  Private
 */
export const bulkUpdateProducts = asyncHandler(async (req, res) => {
  const productsToUpdate = req.body;

  console.log("product update control (datos recibidos):", productsToUpdate);

  if (!Array.isArray(productsToUpdate) || productsToUpdate.length === 0) {
    handleError("Se espera un array de productos para actualizar.", 400);
    return;
  }

  const updatedProducts = [];
  const errors = [];

  for (const productData of productsToUpdate) {
    const { _id, code, lab } = productData;

    if (!_id) {
      errors.push({
        message: `Se requiere un _id para cada producto en la actualización masiva.`,
        product: productData,
      });
      continue;
    }

    try {
      if (code !== undefined) {
        const duplicate = await Product.findOne({
          code: code,
          _id: { $ne: _id },
        }).lean();

        if (duplicate) {
          errors.push({
            message: `El código '${code}' ya pertenece a otro producto. (ID: ${duplicate._id}).`,
            product: productData,
          });
          continue;
        }
      }

      const updateData = {};

      for (const key in productData) {
        if (key === "_id") {
          continue;
        }

        if (key === "lab") {
          if (
            typeof productData.lab === "string" &&
            productData.lab.trim() !== ""
          ) {
            const labDoc = await Lab.findOne({ name: productData.lab.trim() });
            if (!labDoc) {
              errors.push({
                message: `No se encontró el laboratorio con nombre '${productData.lab}'.`,
                product: productData,
              });
              continue;
            }
            updateData.lab = labDoc._id;
          } else if (productData.lab === null) {
            updateData.lab = null;
          }
          continue;
        }

        if (productData[key] !== undefined) {
          updateData[key] = productData[key];
        }
      }

      if (Object.keys(updateData).length === 0) {
        errors.push({
          message: `No se proporcionaron campos válidos para actualizar el producto con ID ${_id}.`,
          product: productData,
        });
        continue;
      }

      console.log("updateData para producto", _id, ":", updateData);

      const up = await Product.findByIdAndUpdate(
        _id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!up) {
        errors.push({
          message: `Producto con ID ${_id} no encontrado para actualizar.`,
          product: productData,
        });
      } else {
        updatedProducts.push(up);
      }
    } catch (error) {
      if (error.code === 11000) {
        let field = Object.keys(error.keyValue)[0];
        let value = error.keyValue[field];
        let errorMessage = `El ${field} '${value}' ya existe para otro producto.`;
        errors.push({
          message: errorMessage,
          product: productData,
        });
      } else {
        errors.push({
          message: `Error al procesar producto con ID ${_id}: ${error.message}`,
          product: productData,
        });
      }
    }
  }

  console.log("datos transformados (productos actualizados):", updatedProducts);

  if (errors.length > 0) {
    res.status(207).json({
      message: "Se han encontrado conflictos durante la actualización masiva.",
      updatedCount: updatedProducts.length,
      errors: errors,
      updatedItems: updatedProducts,
    });
  } else {
    res.status(200).json({
      message: "Todos los productos actualizados exitosamente.",
      updatedCount: updatedProducts.length,
      updatedItems: updatedProducts,
    });
  }
});
