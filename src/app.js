import "dotenv/config";
import conn from "./config/db.js";
import express from "express";
import cors from "cors";
import routes from "./interface/routes/index.js";

const app = express();
conn.then(() => {
  console.log("MongoDB ready");
});

app.use(cors());
app.use(express.json());

app.use("/api/v1", routes);

app.use(endpointNotFound);
// app.use("/api", activityLogger, routes);
app.use(joiErrorHandler);
app.use(errorMiddleware);

// user rate limiters

export default app;
