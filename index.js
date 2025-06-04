import "dotenv/config";
import app from "./src/app.js";

const PROTOCOL = process.env.SSL || "http";
const SERVER_IP = process.env.SERVER_IP || "127.0.0.1";
const SERVER_PORT = process.env.SERVER_PORT || "5000";

const url = `${PROTOCOL}://${SERVER_IP}:${SERVER_PORT}`;

const startApp = () => {
  app.listen(SERVER_PORT, () => {
    console.log(`Medinor API at: ${url}/api/v1/`);
  });
};

startApp();
