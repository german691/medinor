import Client from "./client.model.js";
import bcrypt from "bcrypt";

export const analyzeClients = async (req, res) => {
  try {
    // usar joi luego para esto
    // const { error, value } = clientMigrationSchema.validate(req.body);

    const { clients } = req.body;
    if (!clients || clients.lenght == 0) {
      return res
        .status(400)
        .json({ message: "No se recibieron clientes a ser procesados" });
    }

    const client_codes = clients.map((c) => c.COD_CLIENT);

    const clientsInDB = await Client.find({
      cod_client: { $in: client_codes },
    });

    const currentCodes = new Set(clientsInDB.map((c) => c.cod_client));

    const newClients = [];
    const currentClients = [];

    for (const client of clients) {
      if (currentCodes.has(client.COD_CLIENT)) {
        currentClients.push(client);
      } else {
        newClients.push(client);
      }
    }

    res.status(200).json({
      message: "Análisis completado.",
      summary: {
        totalReceived: clients.length,
        totalNew: newClients.length,
        totalCurrent: currentClients.length,
      },
      data: {
        newClients,
        currentClients,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      details: error.details ?? [],
    });
  }
};

export const confirmClientMigration = async (req, res) => {
  const { newClients } = req.body;

  if (!newClients || newClients.length === 0) {
    return res
      .status(400)
      .json({ message: "No se recibieron clientes para crear." });
  }

  try {
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

    await Client.insertMany(clientsToCreate);

    res.status(201).json({
      message: `Migración completada. Se crearon ${clientsToCreate.length} nuevos clientes.`,
    });
  } catch (error) {
    console.error("Error en confirmClientMigration:", error);
    // Manejo de error de clave duplicada (si por alguna razón algo se coló)
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "Conflicto: Uno o más clientes ya existen." });
    }
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error interno del servidor al guardar los clientes." });
  }
};
