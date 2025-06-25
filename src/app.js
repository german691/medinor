import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./interface/routes/index.js";
import conn from "./domains/db.js";
import { endpointNotFound } from "./domains/status/status.controller.js";
import { errorMiddleware } from "./interface/middleware/error.middleware.js";

const app = express();
conn.then(() => {
  console.log("MongoDB ready");
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

app.use("/api", routes);

app.use(endpointNotFound);
// app.use("/api", activityLogger, routes);
app.use(errorMiddleware);

// user rate limiters

export default app;
