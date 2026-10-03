import jwt, {
  type SignOptions,
} from "jsonwebtoken";

import type { Role } from "@prisma/client";

import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string;

  /*
   * Must match the user's current tokenVersion
   * in the DB, otherwise the token is revoked.
   */
  tokenVersion: number;
}

export const signAccessToken = (
  payload: AccessTokenPayload
): string =>
  jwt.sign(
    payload,
    env.JWT_ACCESS_SECRET,
    {
      expiresIn:
        env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
    }
  );

export const signRefreshToken = (
  payload: RefreshTokenPayload
): string =>
  jwt.sign(
    payload,
    env.JWT_REFRESH_SECRET,
    {
      expiresIn:
        env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
    }
  );

export const verifyAccessToken = (
  token: string
): AccessTokenPayload =>
  jwt.verify(
    token,
    env.JWT_ACCESS_SECRET
  ) as AccessTokenPayload;

export const verifyRefreshToken = (
  token: string
): RefreshTokenPayload =>
  jwt.verify(
    token,
    env.JWT_REFRESH_SECRET
  ) as RefreshTokenPayload;