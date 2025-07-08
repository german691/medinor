import "dotenv/config";
import app from "./src/app.js";
import conn from "./src/domains/db.js";

const PROTOCOL = process.env.PROTOCOL || "http";
const SERVER_IP = process.env.SERVER_IP || "localhost";
const SERVER_PORT = process.env.SERVER_PORT || "5000";

const url = `${PROTOCOL}://${SERVER_IP}:${SERVER_PORT}`;

conn
  .then(() => {
    console.log("MongoDB conectado");
    app.listen(SERVER_PORT, () => {
      console.log(`Medinor API: ${url}/api/`);
    });
  })
  .catch((err) => {
    console.error(
      "Error conectando a MongoDB, no se pudo iniciar la API:",
      err
    );
    process.exit(1);
  });
