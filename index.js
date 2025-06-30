import "dotenv/config";
import app from "./src/app.js";

const PROTOCOL = process.env.SSL || "http";
const SERVER_IP = process.env.SERVER_IP || "192.168.16.111";
const SERVER_PORT = process.env.SERVER_PORT || "5000";

const url = `${PROTOCOL}://${SERVER_IP}:${SERVER_PORT}`;

const startApp = () => {
  app.listen(SERVER_PORT, () => {
    console.log(`Medinor API at: ${url}/api/`);
  });
};

startApp();
