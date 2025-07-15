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

/**
 * @desc    Consulta a la base de datos, devuelve los usuarios ya existentes o conflictivos.
 * @route   POST /api/clients/analyze
 * @access  Private
 */
export const analyzeClients = asyncHandler(async (req, res) => {
  console.log("analyzed");

  const { clients: rawClients } = req.body;
  if (!rawClients || rawClients.length === 0) {
    res.status(400).send("El archivo no contiene clientes.");
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
    res
      .status(404)
      .send("Ningún cliente en el archivo pasó las validaciones requeridas.");
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
 * @desc    Carga los usuarios a MongoDB.
 * @route   POST /api/clients/make-migration
 * @access  Private
 */
export const confirmClientMigration = asyncHandler(async (req, res) => {
  console.log("confirmed");
  const { newClients } = req.body.data;

  if (!newClients || newClients.length === 0) {
    return res
      .status(400)
      .send("No se recibieron clientes válidos para crear.");
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
 * @desc    Obtener clientes paginados con posibilidad de búsqueda
 * @route   GET /api/clients
 * @access  Private
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
    console.error("Error al obtener clientes:", error);
    res.status(500).send("Error interno del servidor al obtener clientes");
  }
});

/**
 * @desc    Obtener todos los clientes.
 * @route   GET /api/clients/all
 * @access  Private
 */
export const getAllClients = asyncHandler(async (req, res) => {
  const clients = await Client.find();
  const items = clients.map((client) => client);
  res.status(200).json({ items });
});

/**
 * @desc    Obtener un único cliente por su ID.
 * @route   GET /api/clients/:id
 * @access  Private
 */
export const getClientById = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) {
    res.status(404).send("Cliente no encontrado.");
  }
  res.status(200).json({ item: client });
});

/**
 * @desc    Crear un nuevo cliente.
 * @route   POST /api/clients
 * @access  Private
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
      res
        .status(409)
        .send(`Ya existe un cliente con el código '${cod_client}'.`);
    }
    if (duplicate.identiftri === identiftri) {
      res.status(409).send(`Ya existe un cliente con el CUIT '${identiftri}'.`);
    }
    if (duplicate.username === finalUsername) {
      res
        .status(409)
        .send(`El nombre de usuario '${finalUsername}' ya está en uso.`);
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
 * @desc    Actualizar un cliente existente.
 * @route   PUT /api/clients/:id
 * @access  Private
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
      res
        .status(409)
        .send(`El código '${cod_client}' ya pertenece a otro cliente.`, 409);
    }
    if (duplicate.identiftri && duplicate.identiftri === identiftri) {
      res
        .status(409)
        .send(`El CUIT '${identiftri}' ya pertenece a otro cliente.`);
    }
    if (duplicate.username && duplicate.username === username) {
      res
        .status(409)
        .send(`El nombre de usuario '${username}' ya está en uso.`);
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
    res.status(404).send("Cliente no encontrado para actualizar.");
  }

  res.status(200).json({ item: updatedClient });
});

/**
 * @desc    Actualizar múltiples clientes.
 * @route   PUT /api/clients/bulk-update
 * @access  Private
 */
export const bulkUpdateClients = asyncHandler(async (req, res) => {
  const clientsToUpdate = req.body;

  if (!Array.isArray(clientsToUpdate) || clientsToUpdate.length === 0) {
    res.status(400).send("Se espera un array de clientes para actualizar.");
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
    return res.status(400).json({ message: "Credenciales no obtenidas" });
  }

  const client = await Client.findOne({ username });

  if (!client) {
    return res.status(401).json({ message: "Credenciales incorrectas" });
  }

  if (!client.active) {
    return res.status(403).json({ message: "Usuario desactivado" });
  }

  console.log("cliente", client);

  const isMatch = bcrypt.compareSync(password, client.password);
  if (!isMatch) {
    return res.status(401).json({
      message: "Credenciales incorrectas",
      password: `${password}`,
      hashed: `${client.password}`,
    });
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

  return res
    .status(200)
    .json({ message: "Contraseña de usuario reseteada correctamente" });
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
