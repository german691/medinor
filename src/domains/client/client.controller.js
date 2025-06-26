import Client from "./client.model.js";
import bcrypt from "bcrypt";
import asyncHandler from "express-async-handler";
import {
  cleanCodClient,
  cleanIdentiftri,
  cleanRazonSoci,
} from "../../util/clientMigrationCleaner.js";
import { clientObjectSchema } from "./client.validation.js";
import { handleError } from "../../util/errorHandler.js";

/**
 * @desc    Consulta a la base de datos
 *          devuelve los usuarios ya existentes o conflictivos.
 * @route   POST /api/clients/analyze
 * @access  Private
 */
export const analyzeClients = asyncHandler(async (req, res) => {
  const { clients: rawClients } = req.body;
  if (!rawClients || rawClients.length === 0) {
    handleError("El archivo no contiene clientes.", 400);
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
    handleError(
      "Ningún cliente en el archivo pasó las validaciones requeridas.",
      400
    );
  }

  const cuits = validClients.map((c) => c.IDENTIFTRI);
  const codes = validClients.map((c) => c.COD_CLIENT);

  const clientsInDB = await Client.find({
    $or: [{ identiftri: { $in: cuits } }, { cod_client: { $in: codes } }],
  });

  const existingCuits = new Set(clientsInDB.map((c) => c.identiftri));
  const existingCodes = new Set(clientsInDB.map((c) => c.cod_client));

  const newClients = [];
  const currentClients = [];
  const conflictingClients = [];

  for (const client of validClients) {
    const codeExists = existingCodes.has(client.COD_CLIENT);
    const cuitExists = existingCuits.has(client.IDENTIFTRI);

    if (codeExists) {
      currentClients.push(client);
    } else if (cuitExists) {
      conflictingClients.push({
        ...client,
        conflictReason: `El CUIT ${client.IDENTIFTRI} ya está en uso por otro cliente.`,
      });
    } else {
      newClients.push(client);
    }
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
  const { newClients } = req.body.data;

  if (!newClients || newClients.length === 0) {
    handleError("No se recibieron clientes válidos para crear.", 400);
  }

  const clientsToCreate = newClients.map((client) => {
    const hashedPassword = bcrypt.hashSync(client.IDENTIFTRI, 10);
    return {
      cod_client: client.COD_CLIENT,
      razon_soci: client.RAZON_SOCI,
      identiftri: client.IDENTIFTRI,
      username: client.IDENTIFTRI,
      password: hashedPassword,
    };
  });

  let createdCount = 0;
  let duplicateClients = [];

  try {
    await Client.insertMany(clientsToCreate, { ordered: false });
    createdCount = newClients.length;
  } catch (error) {
    if (error.code === 11000 && error.writeErrors) {
      createdCount = error.result.nInserted;

      const failedOperations = error.writeErrors.map((err) => err.op);
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
 * Función auxiliar para transformar el _id de MongoDB a un 'id' para el frontend.
 * @param {object} doc - Documento de Mongoose.
 * @returns {object} - Objeto plano con 'id' en lugar de '_id'.
 */
const transformClientDocument = (doc) => {
  const plainObject = doc.toObject ? doc.toObject() : doc;
  const { _id, ...rest } = plainObject;
  return { id: _id.toString(), ...rest };
};

// --- ENDPOINTS DEL CRUD ---

/**
 * @desc    Obtener todos los clientes con paginación, filtros y ordenamiento.
 * @route   GET /api/clients
 * @access  Private
 */
export const getAllClients = asyncHandler(async (req, res) => {
  const clients = await Client.find();
  const items = clients.map((client) => ({
    ...client._doc,
    id: client._doc._id.toString(),
  }));

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
    handleError("Cliente no encontrado.", 404);
  }
  res.status(200).json(transformClientDocument(client));
});

/**
 * @desc    Crear un nuevo cliente.
 * @route   POST /api/clients
 * @access  Private
 */
export const createNewClient = asyncHandler(async (req, res) => {
  const { cod_client, razon_soci, identiftri, active } = req.body;

  const duplicate = await Client.findOne({
    $or: [{ cod_client }, { identiftri }],
  }).lean();
  if (duplicate) {
    handleError("Ya existe un cliente con el mismo Código o CUIT.", 409);
  }

  const hashedPassword = bcrypt.hashSync(String(identiftri), 10);
  const newClient = new Client({
    cod_client,
    razon_soci,
    identiftri,
    active: active ? 1 : 0,
    username: String(identiftri),
    password: hashedPassword,
  });

  const savedClient = await newClient.save();

  res.status(201).json(transformClientDocument(savedClient));
});

/**
 * @desc    Actualizar un cliente existente.
 * @route   PUT /api/clients/:id
 * @access  Private
 */
export const updateClientById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedClient = await Client.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  if (!updatedClient) {
    handleError("Cliente no encontrado para actualizar.", 404);
  }

  res.status(200).json(transformClientDocument(updatedClient));
});

/**
 * @desc    Eliminar un cliente.
 * @route   DELETE /api/clients/:id
 * @access  Private
 */
export const deleteClientById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deletedClient = await Client.findByIdAndDelete(id);

  if (!deletedClient) {
    handleError("Cliente no encontrado para eliminar.", 404);
  }
  res.status(204).send();
});
