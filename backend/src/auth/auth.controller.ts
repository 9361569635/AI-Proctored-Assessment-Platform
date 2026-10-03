import type { CookieOptions, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { registerCandidateSchema, loginSchema } from "./auth.validation";
import * as authService from "./auth.service";
import { isProd } from "../config/env";

const baseCookieOpts: CookieOptions = {
  httpOnly: true,
  secure: isProd, // requires HTTPS in production, per spec §59
  sameSite: "lax",
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("access_token", accessToken, { ...baseCookieOpts, maxAge: 15 * 60 * 1000 });
  res.cookie("refresh_token", refreshToken, {
    ...baseCookieOpts,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth/refresh",
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie("access_token", baseCookieOpts);
  res.clearCookie("refresh_token", { ...baseCookieOpts, path: "/api/auth/refresh" });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = registerCandidateSchema.parse(req.body);
  const { user, accessToken, refreshToken } = await authService.registerCandidate(input);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({ user });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const { user, accessToken, refreshToken } = await authService.login(input);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json({ user });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    await authService.logout(req.user.id);
  }
  clearAuthCookies(res);
  res.status(204).send();
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refresh_token as string | undefined;
  if (!token) {
    throw ApiError.unauthorized("No refresh token provided");
  }
  const accessToken = await authService.refreshAccessToken(token);
  res.cookie("access_token", accessToken, { ...baseCookieOpts, maxAge: 15 * 60 * 1000 });
  res.status(200).json({ accessToken });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized();
  }
  const user = await authService.getMe(req.user.id);
  res.status(200).json({ user });
});
