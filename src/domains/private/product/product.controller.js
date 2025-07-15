import { Lab } from "../lab/lab.model.js";
import { Product } from "./product.model.js";
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import { Category } from "../category/category.model.js";
import createError from "http-errors";

/**
 * Analiza un listado de productos para prepararlos para migración.
 *
 * - Crea laboratorios y categorías si no existen, o usa los existentes.
 * - Valida datos básicos de cada producto (código, descripción, laboratorio, categoría).
 * - Detecta productos **nuevos** para añadir, productos **existentes** sin cambios,
 * y productos con **conflictos** (mismo código con datos diferentes) que requieren revisión.
 * - Filtra productos inválidos y genera un resumen con estadísticas de todo el proceso.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Array<Object>} req.body.products - Array de objetos de producto a analizar.
 * Cada objeto debe contener campos como `code`, `lab`, `category`, `desc`, etc.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un resumen completo del análisis de productos, incluyendo:
 * - `message`: Un mensaje descriptivo del resultado del análisis.
 * - `summary`: Estadísticas de `totalReceived`, `totalValid`, `totalInvalid`, `totalNew`,
 * `totalCurrent`, `totalConflicts`, `totalFilteredOut`.
 * - `data`: Arrays de `newProducts`, `currentProducts`, `conflictingProducts`, `invalidRows`,
 * y `productsReadyForMigration` (para la siguiente fase de migración).
 * @returns {400} - Retorna un error si el cuerpo de la solicitud no contiene un array válido o vacío de productos.
 */
export const analyzeProducts = asyncHandler(async (req, res) => {
  const { products: productsData } = req.body;

  if (!Array.isArray(productsData) || productsData.length === 0) {
    throw createError(
      400,
      "No se encontraron datos de productos en la solicitud o el formato es incorrecto (debe ser un array en 'products')."
    );
  }

  const normalizeName = (name) =>
    name ? String(name).trim().toUpperCase() : "";

  const productsToAnalyze = productsData.filter((product) => {
    const labName = normalizeName(product.lab);
    const categoryName = normalizeName(product.category);

    return labName !== "BAJA" && categoryName !== "BAJA";
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

  const categoriesMap = new Map();
  const categoryNamesMap = new Map();
  const newCategoriesCreated = [];

  const productsWithErrors = [];
  const newProductsForFrontend = [];
  const currentProductsForFrontend = [];
  const conflictingProductsForFrontend = [];
  const newProductsForMigration = [];

  const uniqueLabNames = new Set(
    productsToAnalyze.map((p) => normalizeName(p.lab)).filter(Boolean)
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

  const uniqueCategoryNames = new Set(
    productsToAnalyze.map((p) => normalizeName(p.category)).filter(Boolean)
  );

  for (const categoryName of uniqueCategoryNames) {
    try {
      let category = await Category.findOne({ name: categoryName });
      if (!category) {
        category = new Category({ name: categoryName });
        await category.save();
        newCategoriesCreated.push(category.name);
      }
      categoriesMap.set(category.name, category._id);
      categoryNamesMap.set(category._id.toString(), category.name);
    } catch (categoryError) {
      console.error(
        `Error al procesar categoría ${categoryName}:`,
        categoryError
      );
    }
  }

  for (const productData of productsToAnalyze) {
    try {
      const code = String(productData.code || "").trim();
      const labNameFromCsv = normalizeName(productData.lab);
      const categoryNameFromCsv = normalizeName(productData.category);
      const labId = labsMap.get(labNameFromCsv);
      const categoryId = categoriesMap.get(categoryNameFromCsv);

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
      if (!categoryId) {
        productsWithErrors.push({
          data: productData,
          errors: [
            `Categoría '${productData.category}' no encontrada o no pudo ser creada.`,
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
        category: categoryId,
        desc: productData.desc || null,
        extra_desc: productData.extra_desc || null,
        iva: productData.iva,
        medinor_price: parseFloat(productData.medinor_price) || 0,
        public_price: parseFloat(productData.public_price) || 0,
        price: parseFloat(productData.price) || 0,
        imageUrl: productData.imageUrl || null,
      };

      const existingProduct = await Product.findOne({ code: code }).populate(
        "category"
      );

      if (existingProduct) {
        if (
          existingProduct.desc !== productToProcess.desc ||
          !existingProduct.lab.equals(labId) ||
          !existingProduct.category.equals(categoryId)
        ) {
          conflictingProductsForFrontend.push({
            ...productData,
            lab:
              labNamesMap.get(existingProduct.lab.toString()) ||
              productData.lab,
            category:
              categoryNamesMap.get(existingProduct.category.toString()) ||
              productData.category,
            conflictReason: `Producto con código '${code}' ya existe con descripción, laboratorio o categoría diferente.`,
          });
        } else {
          currentProductsForFrontend.push({
            ...productData,
            lab:
              labNamesMap.get(existingProduct.lab.toString()) ||
              productData.lab,
            category:
              categoryNamesMap.get(existingProduct.category.toString()) ||
              productData.category,
          });
        }
      } else {
        newProductsForMigration.push(productToProcess);

        newProductsForFrontend.push({
          ...productToProcess,
          lab: labNameFromCsv,
          category: categoryNameFromCsv,
          labObjectId: labId.toString(),
          categoryObjectId: categoryId.toString(),
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
 * Confirma y ejecuta la migración de productos previamente analizados.
 *
 * - Requiere un listado de productos que ya han sido validados y contienen IDs válidos
 * para laboratorio y categoría (generalmente provienen de la fase `analyzeProducts`).
 * - Intenta insertar cada producto en la base de datos.
 * - Registra y reporta los errores de inserción individuales.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Array<Object>} req.body.productsToMigrate - Array de objetos de producto
 * listos para ser insertados en la base de datos.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {201} - Retorna un mensaje de éxito con el **conteo de productos creados**
 * y una lista de **errores de migración** si algunas inserciones fallaron.
 * @returns {400} - Retorna un error si el cuerpo de la solicitud no contiene un array
 * válido o vacío de productos para migrar.
 * @returns {500} - Retorna un error interno del servidor si ocurre un fallo inesperado
 * durante el proceso de migración.
 */
export const confirmProductMigration = asyncHandler(async (req, res) => {
  const { productsToMigrate } = req.body;

  if (!Array.isArray(productsToMigrate) || productsToMigrate.length === 0) {
    throw createError(400, "No se encontraron productos válidos para migrar.");
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
            error: "ID de laboratorio inválido o ausente.",
          });
          continue;
        }

        if (
          !productData.category ||
          !mongoose.Types.ObjectId.isValid(productData.category)
        ) {
          migrationErrors.push({
            data: productData,
            error: "ID de categoría inválido o ausente.",
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

    res.status(201).json({
      message: "Migración de productos completada.",
      data: {
        createdCount: createdCount,
        migrationErrors: migrationErrors,
      },
    });
  } catch (error) {
    throw error;
  }
});

/**
 * Obtiene productos paginados, permitiendo filtrado por campos, búsqueda de texto
 * en código, notas, descripción, y por nombre de laboratorio o categoría.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} req.body - Cuerpo de la solicitud con parámetros de consulta.
 * @param {number} [req.body.page=1] - Número de página para la paginación.
 * @param {number} [req.body.limit=25] - Cantidad de productos por página.
 * @param {Object} [req.body.filters={}] - Objeto con criterios de filtrado adicionales.
 * @param {Object} [req.body.sort={}] - Criterios de ordenamiento (ej. `{ key: "price", direction: -1 }`).
 * @param {string} [req.body.search=""] - Texto para buscar en `code`, `notes`, `desc`, `extra_desc`,
 * o en los nombres de `lab` y `category`.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un objeto con la lista de productos, información de paginación y metadatos:
 * - `page`: Número de página actual.
 * - `totalPages`: Total de páginas disponibles.
 * - `totalItems`: Total de productos que coinciden con los filtros.
 * - `items`: Array de objetos de producto formateados, incluyendo `id`, nombres de `lab` y `category`, y `discount`.
 * @returns {500} - Retorna un error interno del servidor si ocurre un problema durante la consulta a la base de datos.
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

    const matchingCategories = await Category.find({
      name: { $regex: search, $options: "i" },
    }).select("_id");

    const categoryIds = matchingCategories.map((category) => category._id);

    searchFilter = {
      $or: [
        ...searchableFields.map((field) => ({
          [field]: { $regex: search, $options: "i" },
        })),
        { lab: { $in: labIds } },
        { category: { $in: categoryIds } },
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
      .populate("category")
      .lean();

    const formattedProducts = products.map((p) => {
      let discountValue = 0;
      if (
        p.medinor_price != null &&
        p.public_price != null &&
        p.public_price !== 0
      ) {
        discountValue = parseFloat(
          (p.medinor_price / p.public_price - 1).toFixed(4)
        );
      }

      return {
        ...p,
        id: p._id.toString(),
        lab: p.lab ? p.lab.name : null,
        category: p.category ? p.category.name : null,
        discount: discountValue,
      };
    });
    const totalPages = Math.ceil(total / pageSize);

    res.status(200).json({
      page: pageNumber,
      totalPages,
      totalItems: total,
      items: formattedProducts,
    });
  } catch (error) {
    throw error;
  }
});

/**
 * Devuelve un producto específico por su ID.
 *
 * - Valida que el formato del ID sea un ObjectId válido de Mongoose.
 * - Incluye la información del laboratorio populada.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.params.id - ID del producto a buscar.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un objeto con el producto encontrado y formateado.
 * @returns {400} - Retorna un error si el ID del producto es inválido.
 * @returns {404} - Retorna un error si el producto no es encontrado.
 * @returns {500} - Retorna un error interno del servidor si ocurre un fallo durante la consulta.
 */
export const getProductById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError(400, "ID de producto inválido.");
    }
    const product = await Product.findById(id).populate("lab").lean();
    if (!product) {
      throw createError(404, "Producto no encontrado.");
    }
    const formattedProduct = {
      ...product,
      id: product._id.toString(),
      lab: product.lab,
    };
    res.status(200).json({ product: formattedProduct });
  } catch (error) {
    throw error;
  }
});

/**
 * Crea un nuevo producto individual en la base de datos.
 *
 * - Requiere un código, descripción, laboratorio y categoría válidos.
 * - Valida la existencia de los nombres de laboratorio y categoría, convirtiéndolos a sus IDs.
 * - Previene la creación de duplicados por el campo `code`.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos del nuevo producto.
 * @param {string} req.body.code - Código único del producto.
 * @param {string} [req.body.notes] - Notas adicionales del producto.
 * @param {string} req.body.lab - Nombre del laboratorio al que pertenece el producto.
 * @param {string} req.body.category - Nombre de la categoría del producto.
 * @param {string} req.body.desc - Descripción del producto.
 * @param {string} [req.body.extra_desc] - Descripción extra del producto.
 * @param {number} [req.body.iva] - Valor del IVA.
 * @param {number} [req.body.medinor_price] - Precio Medinor.
 * @param {number} [req.body.public_price] - Precio Público.
 * @param {number} [req.body.price] - Precio general.
 * @param {string} [req.body.imageUrl] - URL de la imagen del producto.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {201} - Retorna un mensaje de éxito y el objeto del producto creado, formateado.
 * @returns {400} - Retorna un error si faltan datos obligatorios (`code`, `desc`, `lab`, `category`),
 * o si el laboratorio o la categoría proporcionados no son válidos/no existen.
 * @returns {409} - Retorna un error si ya existe un producto con el mismo `code`.
 * @returns {500} - Retorna un error interno del servidor si falla la creación del producto.
 */
export const createProduct = asyncHandler(async (req, res) => {
  try {
    const {
      code,
      notes,
      lab,
      category,
      desc,
      extra_desc,
      iva,
      medinor_price,
      public_price,
      price,
    } = req.body;

    console.log(req.body);

    if (!code || !desc || !lab || !category) {
      throw createError(
        400,
        "Código, descripción, laboratorio y categoría son campos requeridos."
      );
    }

    const labIsValid = await Lab.findOne({ name: lab });
    if (!labIsValid) {
      throw createError(
        400,
        `No se proporcionó un nombre de laboratorio válido: '${lab}'.`
      );
    }
    const labId = labIsValid._id;

    const categoryIsValid = await Category.findOne({ name: category });
    if (!categoryIsValid) {
      throw createError(
        400,
        `No se proporcionó un nombre de categoría válido: '${category}'.`
      );
    }
    const categoryId = categoryIsValid._id;

    const existingProduct = await Product.findOne({ code: code });
    if (existingProduct) {
      throw createError(409, `Ya existe un producto con el código '${code}'.`);
    }

    const newProduct = new Product({
      code,
      notes,
      lab: labId,
      category: categoryId,
      desc,
      extra_desc,
      iva,
      medinor_price,
      public_price,
      price,
    });
    await newProduct.save();

    const createdProduct = await Product.findById(newProduct._id)
      .populate("lab")
      .populate("category")
      .lean();

    const formattedCreatedProduct = {
      ...createdProduct,
      id: createdProduct._id.toString(),
      lab: createdProduct.lab ? createdProduct.lab.name : null,
      category: createdProduct.category ? createdProduct.category.name : null,
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
    throw error;
  }
});

/**
 * Actualiza un producto existente por su ID.
 *
 * - Valida que el ID del producto y el ID del laboratorio (si se actualiza) sean válidos.
 * - Verifica la unicidad del código del producto si se intenta cambiar,
 * asegurándose de que no colisione con otro producto existente.
 * - Aplica las actualizaciones proporcionadas y retorna el producto modificado.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.params.id - ID del producto a actualizar.
 * @param {Object} req.body - Cuerpo de la solicitud con los campos a actualizar.
 * @param {string} [req.body.code] - Nuevo código del producto (debe ser único).
 * @param {string} [req.body.lab] - Nuevo ID (ObjectId) del laboratorio.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un mensaje de éxito y el objeto del producto actualizado.
 * @returns {400} - Retorna un error si el ID del producto o el ID del laboratorio son inválidos.
 * @returns {404} - Retorna un error si el producto no es encontrado para actualizar.
 * @returns {409} - Retorna un error si el `code` proporcionado ya está en uso por otro producto.
 * @returns {500} - Retorna un error interno del servidor si ocurre un fallo durante la actualización.
 */
export const updateProduct = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { code, lab } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError(400, "ID de producto inválido.");
    }
    if (!mongoose.Types.ObjectId.isValid(lab)) {
      throw createError(400, "ID de laboratorio proporcionado no es válido.");
    }

    if (code) {
      const productWithSameCode = await Product.findOne({ code: code });
      if (productWithSameCode && productWithSameCode._id.toString() !== id) {
        throw createError(
          409,
          `El código '${code}' ya está en uso por otro producto.`
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
      throw createError(404, "Producto no encontrado.");
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
      throw createError(
        409,
        "Ya existe un producto con el código proporcionado."
      );
    }
    throw error;
  }
});

/**
 * Actualiza múltiples productos a la vez mediante un array de datos de actualización.
 *
 * - Valida la presencia de `_id` para cada producto a actualizar.
 * - Si se actualizan `lab` o `category` por nombre, los busca y convierte a sus IDs.
 * - Detecta y reporta conflictos de `code` duplicados durante la actualización.
 * - Realiza actualizaciones parciales (solo los campos provistos).
 * - Retorna un resumen de productos actualizados exitosamente y los errores.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Array<Object>} req.body - Array de objetos, donde cada objeto debe contener
 * el `_id` del producto y los campos a actualizar.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un mensaje de éxito, el conteo de productos actualizados y
 * la lista de ítems actualizados si **todas** las operaciones fueron exitosas.
 * @returns {207} - Retorna un mensaje de éxito parcial con el conteo de actualizaciones,
 * una lista de **errores** detallados para los productos que fallaron, y los ítems
 * que sí se actualizaron.
 * @returns {400} - Retorna un error si el cuerpo de la solicitud no es un array válido o está vacío.
 */
export const bulkUpdateProducts = asyncHandler(async (req, res) => {
  const productsToUpdate = req.body;

  console.log("product update control (datos recibidos):", productsToUpdate);

  if (!Array.isArray(productsToUpdate) || productsToUpdate.length === 0) {
    throw createError(400, "Se espera un array de productos para actualizar.");
    return;
  }

  const updatedProducts = [];
  const errors = [];

  for (const productData of productsToUpdate) {
    const { _id, code, lab, category } = productData;

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

        if (key === "category") {
          if (
            typeof productData.category === "string" &&
            productData.category.trim() !== ""
          ) {
            const categoryDoc = await Category.findOne({
              name: productData.category.trim(),
            });
            if (!categoryDoc) {
              errors.push({
                message: `No se encontró la categoría con nombre '${productData.category}'.`,
                product: productData,
              });
              continue;
            }
            updateData.category = categoryDoc._id;
          } else if (productData.category === null) {
            updateData.category = null;
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
