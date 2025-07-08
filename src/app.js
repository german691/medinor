import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./interface/routes/index.js";
import { endpointNotFound } from "./domains/public/status/status.controller.js";
import { errorMiddleware } from "./interface/middleware/error.middleware.js";
import { initAdmin } from "./util/initAdmin.js";
import { initSuperadmin } from "./util/initSuperadmin.js";

// Configuración inicial
initAdmin();
initSuperadmin();

const app = express();

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

app.use(cors());

app.use("/api", routes);

app.use(endpointNotFound);
app.use(errorMiddleware);

// user rate limiters a definir

export default app;
