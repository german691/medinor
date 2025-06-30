import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./interface/routes/index.js";
import conn from "./domains/db.js";
import { endpointNotFound } from "./domains/public/status/status.controller.js";
import { errorMiddleware } from "./interface/middleware/error.middleware.js";

const app = express();
conn.then(() => {
  console.log("MongoDB ready");
});

app.use(cors("*"));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

app.use("/api", routes);

app.use(endpointNotFound);
// app.use("/api", activityLogger, routes);
app.use(errorMiddleware);

// user rate limiters

export default app;
