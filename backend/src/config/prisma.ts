import { PrismaClient } from "@prisma/client";
import { env } from "./env";

// Prevent creating a new PrismaClient (and a new connection pool) on every
// hot-reload in dev, per Prisma's documented pattern.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
