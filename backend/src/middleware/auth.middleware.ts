import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { verifyAccessToken } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

/**
 * Reads the access token from the `access_token` httpOnly cookie (preferred,
 * used by the web frontend) or an `Authorization: Bearer <token>` header
 * (used by non-browser API clients / the future AI-interview service).
 * On success, attaches `req.user = { id, role }`. Never trusts a role or
 * user id sent in the request body — role/permission checks always derive
 * from the verified token, not from client input.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.access_token as string | undefined;
  const header = req.headers.authorization;
  const headerToken = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const token = cookieToken ?? headerToken;

  if (!token) {
    return next(ApiError.unauthorized("Authentication required"));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired session"));
  }
}
