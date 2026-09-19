import cors from "cors";
import express from "express";
import { env } from "./config";
import {
  globalError,
  notFound,
  requestLogger,
} from "./middlewares";
import apiRouter from "./routes";
import { catchAsync, sendResponse } from "./utils";

const app = express();

app.use(
  cors({
    origin: env.corsOrigins.length > 0 ? env.corsOrigins : false,
    credentials: true,
  }),
);
app.use(express.json({ limit: "3mb" }));
app.use(requestLogger);

function healthPayload() {
  return {
    ok: true,
    service: "@r2a/server",
    env: env.nodeEnv,
    timestamp: new Date().toISOString(),
  };
}

/** Root probes (Render / browsers) — API lives under /api/v1. */
app.get(
  "/",
  catchAsync(async (_req, res) => {
    sendResponse(res, {
      statusCode: 200,
      message: "OK",
      data: {
        ...healthPayload(),
        health: "/health",
        api: "/api/v1",
      },
    });
  }),
);

app.head("/", (_req, res) => {
  res.status(200).end();
});

app.get(
  "/health",
  catchAsync(async (_req, res) => {
    sendResponse(res, {
      statusCode: 200,
      message: "OK",
      data: healthPayload(),
    });
  }),
);

app.use("/api/v1", apiRouter);

app.use(notFound);
app.use(globalError);

export default app;
