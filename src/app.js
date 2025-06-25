import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./interface/routes/index.js";
import conn from "./model/db.js";

const app = express();
conn.then(() => {
  console.log("MongoDB ready");
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

app.use("/api", routes);

// --- AQUÍ ESTÁ LA LÍNEA CLAVE ---

// app.use(endpointNotFound);
// app.use("/api", activityLogger, routes);
// app.use(joiErrorHandler);
// app.use(errorMiddleware);

// user rate limiters

export default app;
