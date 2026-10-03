import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { ApiError } from "../utils/ApiError";

/**
 * Usage: router.get("/dashboard", requireAuth, requireRole("MANAGEMENT", "SUPER_ADMIN"), handler)
 *
 * Must run after requireAuth. Candidate-facing routes must never mount this
 * with MANAGEMENT/SUPER_ADMIN, and management routes must never omit it —
 * this is the single choke point that keeps candidate APIs from ever being
 * able to reach management data (spec §2, §58).
 */
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!allowed.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to access this resource"));
    }
    next();
  };
}
