import Client from "./client.model.js";
import bcrypt from "bcrypt";
import asyncHandler from "express-async-handler";
import {
  cleanCodClient,
  cleanIdentiftri,
  cleanRazonSoci,
} from "../../../util/clientMigrationCleaner.js";
import { clientObjectSchema } from "./client.validation.js";
import { createToken } from "../../../util/createToken.js";
import { Purposes } from "../../../interface/middleware/auth.middleware.js";
import { Roles } from "../../roles.js";
import createError from "http-errors";

/**
 * Analiza un listado de clientes proporcionado para identificar su estado (nuevo, existente, conflictivo)
 * antes de una posible migración. Realiza validaciones básicas y compara con la base de datos para
 * detectar duplicados y datos inválidos.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Array<Object>} req.body.clients - **Array** de objetos de cliente a analizar. Cada objeto
 * debe contener al menos `COD_CLIENT`, `IDENTIFTRI` (CUIT) y `RAZON_SOCI`.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un resumen detallado del análisis con detalles de clientes **nuevos**, **existentes**,
 * en **conflicto** e **inválidos**.
 * @returns {400} - Retorna un error si el array de clientes en la solicitud es inválido o vacío.
 * @returns {404} - Retorna un error si ningún cliente en el archivo pasa las validaciones iniciales.
 */
export const analyzeClients = asyncHandler(async (req, res) => {
  const { clients: rawClients } = req.body;
  if (!rawClients || rawClients.length === 0) {
    throw createError(400, "El archivo no contiene clientes.");
  }

  const cleanedClients = rawClients.map((client) => ({
    COD_CLIENT: cleanCodClient(client.COD_CLIENT),
    IDENTIFTRI: cleanIdentiftri(client.IDENTIFTRI),
    RAZON_SOCI: cleanRazonSoci(client.RAZON_SOCI),
    originalData: client,
  }));

  const validClients = [];
  const invalidRows = [];

  for (const client of cleanedClients) {
    const { error } = clientObjectSchema.validate({
      COD_CLIENT: client.COD_CLIENT,
      IDENTIFTRI: client.IDENTIFTRI,
      RAZON_SOCI: client.RAZON_SOCI,
    });

    if (error) {
      invalidRows.push({
        data: client.originalData,
        errors: error.details.map((d) => d.message),
      });
    } else {
      validClients.push({
        COD_CLIENT: client.COD_CLIENT,
        IDENTIFTRI: client.IDENTIFTRI,
        RAZON_SOCI: client.RAZON_SOCI,
      });
    }
  }

  if (validClients.length === 0 && invalidRows.length > 0) {
    createError(
      404,
      "Ningún cliente en el archivo pasó las validaciones requeridas."
    );
  }

  const cuitsInFile = validClients.map((c) => c.IDENTIFTRI);
  const codesInFile = validClients.map((c) => c.COD_CLIENT);

  const clientsInDB = await Client.find({
    $or: [
      { identiftri: { $in: cuitsInFile } },
      { cod_client: { $in: codesInFile } },
    ],
  });

  const existingCuitsInDB = new Set(clientsInDB.map((c) => c.identiftri));
  const existingCodesInDB = new Set(clientsInDB.map((c) => c.cod_client));

  const newClients = [];
  const currentClients = [];
  const conflictingClients = [];

  const processedCodes = new Set();
  const processedCuits = new Set();

  for (const client of validClients) {
    const { COD_CLIENT, IDENTIFTRI } = client;

    if (existingCodesInDB.has(COD_CLIENT)) {
      currentClients.push(client);
      continue;
    }

    if (existingCuitsInDB.has(IDENTIFTRI)) {
      conflictingClients.push({
        ...client,
        conflictReason: `El CUIT ${IDENTIFTRI} ya está en uso por otro cliente en la base de datos.`,
      });
      continue;
    }

    if (processedCodes.has(COD_CLIENT)) {
      conflictingClients.push({
        ...client,
        conflictReason: `El Cód. Cliente ${COD_CLIENT} está duplicado dentro del archivo.`,
      });
      continue;
    }

    if (processedCuits.has(IDENTIFTRI)) {
      conflictingClients.push({
        ...client,
        conflictReason: `El CUIT ${IDENTIFTRI} está duplicado dentro del archivo.`,
      });
      continue;
    }

    newClients.push(client);
    processedCodes.add(COD_CLIENT);
    processedCuits.add(IDENTIFTRI);
  }

  res.status(200).json({
    message: "Análisis completado.",
    summary: {
      totalReceived: rawClients.length,
      totalValid: validClients.length,
      totalInvalid: invalidRows.length,
      totalNew: newClients.length,
      totalCurrent: currentClients.length,
      totalConflicts: conflictingClients.length,
    },
    data: {
      newClients,
      currentClients,
      conflictingClients,
      invalidRows,
    },
  });
});

/**
 * Confirma y ejecuta la migración de clientes previamente analizados.
 * Inserta los clientes identificados como "nuevos" en la base de datos,
 * generando un nombre de usuario y contraseña por defecto (basados en el CUIT).
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} req.body - El cuerpo de la solicitud.
 * @param {Array<Object>} req.body.data.newClients - **Array** de objetos de cliente a crear.
 * Cada objeto debe contener `COD_CLIENT`, `RAZON_SOCI` e `IDENTIFTRI`.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {201} - Retorna un mensaje de éxito con el **conteo de clientes creados** y
 * una lista de **errores de migración** si algunas inserciones fallaron.
 * @returns {400} - Retorna un error si no se reciben clientes válidos para crear.
 * @returns {500} - Retorna un error interno del servidor si ocurre un fallo inesperado durante la inserción.
 */
export const confirmClientMigration = asyncHandler(async (req, res) => {
  const { newClients } = req.body.data;

  if (!newClients || newClients.length === 0) {
    throw createError(400, "No se recibieron clientes válidos para crear.");
  }

  const clientsToCreate = newClients.map((client) => {
    console.log({
      cod_client: client.COD_CLIENT,
      razon_soci: client.RAZON_SOCI,
      identiftri: client.IDENTIFTRI,
      username: String(client.IDENTIFTRI),
    });

    const hashedPassword = bcrypt.hashSync(String(client.IDENTIFTRI), 10);
    return {
      cod_client: client.COD_CLIENT,
      razon_soci: client.RAZON_SOCI,
      identiftri: client.IDENTIFTRI,
      username: String(client.IDENTIFTRI).trim(),
      password: hashedPassword,
    };
  });

  let createdCount = 0;
  let duplicateClients = [];

  try {
    await Client.insertMany(clientsToCreate, { ordered: false });
    createdCount = clientsToCreate.length;
  } catch (error) {
    if (error.code === 11000 && error.writeErrors) {
      createdCount = error.result.nInserted;
      const failedOperations = error.writeErrors
        .map((err) => err.op)
        .filter((op) => op);
      duplicateClients = failedOperations.map((op) => ({
        COD_CLIENT: op.cod_client,
        IDENTIFTRI: op.identiftri,
        RAZON_SOCI: op.razon_soci,
      }));
    } else {
      throw error;
    }
  }

  const message = `Migración completada. Clientes nuevos creados: ${createdCount}. Clientes duplicados encontrados: ${duplicateClients.length}.`;

  res.status(201).json({
    message,
    data: {
      createdCount,
      duplicateClients,
    },
  });
});

/**
 * Obtiene un listado paginado de clientes, con opciones de filtrado,
 * ordenamiento y búsqueda por campos específicos (código, razón social, CUIT, username).
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} req.body - El cuerpo de la solicitud con parámetros de consulta.
 * @param {number} [req.body.page=1] - Número de página para la paginación.
 * @param {number} [req.body.limit=25] - Cantidad de clientes por página.
 * @param {Object} [req.body.filters={}] - Objeto con criterios de filtrado adicionales.
 * @param {Object} [req.body.sort={}] - Criterios de ordenamiento (ej. `{ key: "createdAt", direction: -1 }`).
 * @param {string} [req.body.search=""] - Texto para buscar en `cod_client`, `razon_soci`, `identiftri`, `username`.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un objeto con la lista de clientes, información de paginación y el total de ítems.
 * @returns {Object} returns.data - Objeto que contiene los datos de la respuesta.
 * @returns {number} returns.data.page - Número de página actual.
 * @returns {number} returns.data.totalPages - Total de páginas disponibles.
 * @returns {number} returns.data.totalItems - Total de clientes que coinciden con los filtros.
 * @returns {Array<Object>} returns.data.items - Array de objetos de cliente obtenidos.
 * @returns {500} - Retorna un error interno del servidor si falla la consulta a la base de datos.
 */
export const getClients = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 25,
    filters = {},
    sort = {},
    search = "",
  } = req.body;

  // paginación
  const pageNumber = parseInt(page);
  const pageSize = parseInt(limit);

  const skip = (pageNumber - 1) * pageSize;

  // ordenamiento básico
  const sortObj = {};
  if (sort?.key && sort?.direction) {
    sortObj[sort.key] = sort.direction;
  }

  // lógica de búsqueda
  const searchableFields = [
    "cod_client",
    "razon_soci",
    "identiftri",
    "username",
  ];

  let searchFilter = {};
  if (search) {
    searchFilter = {
      $or: searchableFields.map((field) => ({
        [field]: { $regex: search, $options: "i" },
      })),
    };
  }

  const finalFilters = {
    ...filters,
    ...(search ? searchFilter : {}),
  };

  try {
    const total = await Client.countDocuments(finalFilters);

    const clients = await Client.find(finalFilters)
      .sort(sortObj)
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalPages = Math.ceil(total / pageSize);

    res.status(200).json({
      page: pageNumber,
      totalPages,
      totalItems: total,
      items: clients,
    });
  } catch (error) {
    throw error;
  }
});

/**
 * Obtiene un listado de todos los clientes existentes en la base de datos.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un objeto que contiene un array de todos los clientes.
 * @returns {Array<Object>} returns.items - Array de objetos de cliente.
 */
export const getAllClients = asyncHandler(async (req, res) => {
  const clients = await Client.find();
  const items = clients.map((client) => client);
  res.status(200).json({ items });
});

/**
 * Obtiene los detalles de un único cliente por su ID.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.params.id - El ID del cliente a buscar.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un objeto con los detalles del cliente encontrado.
 * @returns {404} - Retorna un error si el cliente no es encontrado.
 * @returns {500} - Retorna un error interno del servidor si falla la consulta.
 */
export const getClientById = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) {
    throw createError(404, "Cliente no encontrado.");
  }
  res.status(200).json({ item: client });
});

/**
 * Crea un nuevo cliente en la base de datos. Genera un nombre de usuario y
 * una contraseña por defecto (basados en el CUIT) si no se proporcionan,
 * y encripta la contraseña.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} req.body - El cuerpo de la solicitud con los datos del nuevo cliente.
 * @param {string} req.body.cod_client - Código único del cliente.
 * @param {string} req.body.razon_soci - Razón social del cliente.
 * @param {string} req.body.identiftri - Identificador fiscal (CUIT) del cliente.
 * @param {string} [req.body.username] - Nombre de usuario (por defecto es `identiftri`).
 * @param {string} [req.body.password] - Contraseña (por defecto es `identiftri`).
 * @param {boolean} [req.body.active] - Estado de actividad del cliente (por defecto es `true`).
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {201} - Retorna un mensaje de éxito y el objeto del cliente creado.
 * @returns {409} - Retorna un error si ya existe un cliente con el mismo `cod_client`,
 * `identiftri` o `username`.
 * @returns {500} - Retorna un error interno del servidor si falla la creación del cliente.
 */
export const createNewClient = asyncHandler(async (req, res) => {
  const { cod_client, razon_soci, identiftri, username, password, active } =
    req.body;

  const finalUsername = username || String(identiftri);
  const passwordToHash = password || String(identiftri);
  const hashedPassword = bcrypt.hashSync(passwordToHash, 10);

  const duplicate = await Client.findOne({
    $or: [{ cod_client }, { identiftri }, { username: finalUsername }],
  }).lean();

  if (duplicate) {
    if (duplicate.cod_client === cod_client) {
      throw createError(
        409,
        `Ya existe un cliente con el código '${cod_client}'.`
      );
    }
    if (duplicate.identiftri === identiftri) {
      throw createError(
        409,
        `Ya existe un cliente con el CUIT '${identiftri}'.`
      );
    }
    if (duplicate.username === finalUsername) {
      throw createError(
        409,
        `El nombre de usuario '${finalUsername}' ya está en uso.`
      );
    }
  }

  const newClient = new Client({
    cod_client,
    razon_soci,
    identiftri,
    active,
    username: finalUsername,
    password: hashedPassword,
  });

  const savedClient = await newClient.save();
  res.status(201).json({ item: savedClient });
});

/**
 * Actualiza los datos de un cliente existente por su ID.
 * Permite actualizar campos individuales y maneja la encriptación de la contraseña
 * si se proporciona una nueva.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {string} req.params.id - El ID del cliente a actualizar.
 * @param {Object} req.body - El cuerpo de la solicitud con los datos a actualizar.
 * Puede incluir `cod_client`, `razon_soci`, `identiftri`, `username`, `password`, etc.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna el objeto del cliente actualizado.
 * @returns {404} - Retorna un error si el cliente no es encontrado para actualizar.
 * @returns {409} - Retorna un error si el `cod_client`, `identiftri` o `username`
 * proporcionado ya está en uso por otro cliente.
 * @returns {500} - Retorna un error interno del servidor si falla la actualización.
 */
export const updateClientById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { cod_client, identiftri, username, password } = req.body;

  const duplicate = await Client.findOne({
    $or: [{ cod_client }, { identiftri }, { username }],
    _id: { $ne: id },
  }).lean();

  if (duplicate) {
    if (duplicate.cod_client && duplicate.cod_client === cod_client) {
      throw createError(
        409,
        `El código '${cod_client}' ya pertenece a otro cliente.`
      );
    }
    if (duplicate.identiftri && duplicate.identiftri === identiftri) {
      throw createError(
        409,
        `El CUIT '${identiftri}' ya pertenece a otro cliente.`
      );
    }
    if (duplicate.username && duplicate.username === username) {
      throw createError(
        409,
        `El nombre de usuario '${username}' ya está en uso.`
      );
    }
  }

  const updateData = req.body;

  if (password) {
    updateData.password = bcrypt.hashSync(password, 10);
  } else {
    delete updateData.password;
  }

  const updatedClient = await Client.findByIdAndUpdate(id, updateData, {
    new: true,
  });

  if (!updatedClient) {
    throw createError(404, "Cliente no encontrado para actualizar.");
  }

  res.status(200).json({ item: updatedClient });
});

/**
 * Actualiza múltiples clientes de forma masiva. Procesa un array de objetos de cliente,
 * aplicando las actualizaciones a cada uno. Maneja duplicados y errores individualmente.
 *
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Array<Object>} req.body - Array de objetos de cliente a actualizar. Cada objeto
 * debe contener al menos `_id` y los campos a modificar.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {200} - Retorna un mensaje de éxito y la lista de clientes actualizados
 * si todas las operaciones fueron exitosas.
 * @returns {207} - Retorna un mensaje de éxito parcial con detalles de los errores
 * encontrados para los clientes que no pudieron actualizarse.
 * @returns {400} - Retorna un error si el cuerpo de la solicitud no es un array válido o está vacío.
 */
export const bulkUpdateClients = asyncHandler(async (req, res) => {
  const clientsToUpdate = req.body;

  if (!Array.isArray(clientsToUpdate) || clientsToUpdate.length === 0) {
    throw createError(400, "Se espera un array de clientes para actualizar.");
  }

  const updatedClients = [];
  const errors = [];

  for (const clientData of clientsToUpdate) {
    const { _id, cod_client, identiftri, username, ...restOfClientData } =
      clientData;

    // falta la lógica de login
    // const { newPassword } = req.body

    if (!_id) {
      errors.push({
        message: `Se requiere un _id para cada cliente en la actualización masiva.`,
        client: clientData,
      });
      continue;
    }

    try {
      const duplicate = await Client.findOne({
        $or: [{ identiftri }, { username }],
        _id: { $ne: _id },
      }).lean();

      if (duplicate) {
        let duplicateMessage = "";
        if (duplicate.cod_client && duplicate.cod_client === cod_client) {
          duplicateMessage = `El código '${cod_client}' ya pertenece a otro cliente (ID: ${duplicate._id}).`;
        } else if (
          duplicate.identiftri &&
          duplicate.identiftri === identiftri
        ) {
          duplicateMessage = `El CUIT '${identiftri}' ya pertenece a otro cliente (ID: ${duplicate._id}).`;
        } else if (duplicate.username && duplicate.username === username) {
          duplicateMessage = `El nombre de usuario '${username}' ya está en uso (ID: ${duplicate._id}).`;
        }
        errors.push({ message: duplicateMessage, client: clientData });
        continue;
      }

      const updateData = { ...restOfClientData };

      if (cod_client !== undefined) updateData.cod_client = cod_client;
      if (identiftri !== undefined) updateData.identiftri = identiftri;
      if (username !== undefined) updateData.username = username;
      // no usar esta lógica
      // if (newPassword) {
      //   updateData.newPassword = bcrypt.hashSync(newPassword, 10);
      // } else if (newPassword === null) {
      //   updateData.newPassword = null;
      // }

      const updatedClient = await Client.findByIdAndUpdate(
        _id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedClient) {
        errors.push({
          message: `Cliente con ID ${_id} no encontrado para actualizar`,
          client: clientData,
        });
      } else {
        updatedClients.push(updatedClient);
      }
    } catch (error) {
      if (error.code === 11000) {
        let field = Object.keys(error.keyValue)[0];
        let value = error.keyValue[field];
        let errorMessage = `El ${field} '${value}' ya existe para otro cliente.`;
        errors.push({
          message: errorMessage,
          client: clientData,
        });
      } else {
        errors.push({
          message: `Error al procesar cliente con ID ${_id}: ${error.message}`,
          client: clientData,
        });
      }
    }
  }

  if (errors.length > 0) {
    res.status(207).json({
      message: "Se han encontrado conflictos",
      updatedCount: updatedClients.length,
      errors: errors,
      updatedItems: updatedClients,
    });
  } else {
    res.status(200).json({
      message: "Todos los clientes actualizados exitosamente",
      updatedCount: updatedClients.length,
      updatedItems: updatedClients,
    });
  }
});

/**
 * AUTENTICACIÓN
 *
 * @desc    Actualizar múltiples clientes.
 * @route   POST /api/clients/login
 * @access  Public
 */
export const loginClient = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw createError(400, "Credenciales no obtenidas");
  }

  const client = await Client.findOne({ username });

  if (!client) {
    throw createError(401, "Credenciales incorrectas");
  }

  const isMatch = bcrypt.compareSync(password, client.password);
  if (!isMatch) {
    throw createError(401, "Credenciales incorrectas");
  }

  if (!client.active) {
    throw createError(403, "Usuario desactivado");
  }

  if (client.must_change_password) {
    const token = await createToken({
      payload: {
        id: client._id,
        username: client.username,
        role: Roles.CLIENT,
        purpose: Purposes.resetPassword,
      },
      expiresIn: "15m",
    });

    return res.status(200).json({
      message: "Cambio de contraseña requerido.",
      action_required: "reset-password",
      redirect_to: "reset_password",
      token: token,
    });
  }

  const token = await createToken({
    payload: {
      id: client._id,
      username: client.username,
      role: Roles.CLIENT,
    },
  });

  return res.status(200).json({ token, role: Roles.CLIENT });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const { id } = req.user;

  const hashedPassword = bcrypt.hashSync(newPassword, 10);

  await Client.findByIdAndUpdate(id, {
    password: hashedPassword,
    must_change_password: false,
  });

  return res.status(200).json({
    message: "Contraseña de usuario reseteada correctamente",
  });
});

export const getSelfClientAccountInfo = asyncHandler(async (req, res) => {
  const { client } = req;

  res.status(200).json({
    data: {
      id: client._id,
      username: client.username,
      razon_soci: client.razon_soci.trim(),
    },
  });
});
