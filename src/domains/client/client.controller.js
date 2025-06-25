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

  for (const client of validClients) {
    if (
      existingCuits.has(client.IDENTIFTRI) ||
      existingCodes.has(client.COD_CLIENT)
    ) {
      currentClients.push(client);
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
    },
    data: {
      newClients,
      currentClients,
      invalidRows,
    },
  });
});

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

  try {
    await Client.insertMany(clientsToCreate);
  } catch (error) {
    if (error.code === 11000) {
      handleError(
        "Conflicto: Uno o más de los clientes que intentas crear ya existen.",
        409
      );
    }
    throw error;
  }

  res.status(201).json({
    message: `Migración completada. Se crearon ${clientsToCreate.length} nuevos clientes.`,
  });
});
