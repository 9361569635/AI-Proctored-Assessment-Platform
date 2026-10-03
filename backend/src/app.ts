import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";
import rateLimit from "express-rate-limit";
import { prisma } from "./config/prisma";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true, // required for httpOnly auth cookies
    })
  );
  app.use(cookieParser());
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
  app.get("/health/ready", async (_req, res) => {
    try { await prisma.$queryRaw`SELECT 1`; res.status(200).json({ status: "ready", database: "ok" }); }
    catch { res.status(503).json({ status: "not_ready", database: "unavailable" }); }
  });

  app.use("/api", apiRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
