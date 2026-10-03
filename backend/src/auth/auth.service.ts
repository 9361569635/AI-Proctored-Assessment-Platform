import { prisma } from "../config/prisma";
import { hashPassword, verifyPassword } from "../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";
import type { RegisterCandidateInput, LoginInput } from "./auth.validation";

function sanitizeUser<T extends { passwordHash: string }>(user: T) {
  const { passwordHash: _omit, ...safe } = user;
  return safe;
}

function issueTokenPair(user: { id: string; role: "CANDIDATE" | "MANAGEMENT" | "SUPER_ADMIN"; tokenVersion: number }) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, tokenVersion: user.tokenVersion });
  return { accessToken, refreshToken };
}

/**
 * Candidate self-registration. Per spec §2/§57, MANAGEMENT and SUPER_ADMIN
 * accounts are provisioned by a Super Admin (later phase — "Manage
 * management accounts"), not via open self-registration, so this endpoint
 * only ever creates CANDIDATE users.
 *
 * Resume upload is intentionally NOT part of registration here even though
 * §3 lists it as a registration field: resume storage/parsing is its own
 * module (spec §71, module 6) with its own validation (file type/size/
 * malware scanning) and storage backend. The candidate registers first,
 * then uploads a resume via a dedicated endpoint in that phase.
 */
export async function registerCandidate(input: RegisterCandidateInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const jobRole = await prisma.jobRole.findUnique({ where: { id: input.jobRoleId } });
  if (!jobRole) {
    throw ApiError.badRequest("Selected job role does not exist");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.fullName,
      email: input.email,
      passwordHash,
      role: "CANDIDATE",
      candidate: {
        create: {
          phone: input.mobileNumber,
          jobRoleId: input.jobRoleId,
        },
      },
    },
    include: { candidate: true },
  });

  const tokens = issueTokenPair(user);
  return { user: sanitizeUser(user), ...tokens };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const tokens = issueTokenPair(user);
  return { user: sanitizeUser(user), ...tokens };
}

/**
 * Invalidates every refresh token issued before now for this user by
 * bumping tokenVersion — a stateless alternative to a server-side token
 * blocklist. Old refresh tokens fail verification in refreshAccessToken()
 * below because their embedded tokenVersion no longer matches.
 */
export async function logout(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}

export async function refreshAccessToken(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.tokenVersion !== payload.tokenVersion) {
    throw ApiError.unauthorized("Session has been revoked, please log in again");
  }

  return signAccessToken({ sub: user.id, role: user.role });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { candidate: true, managementUser: true },
  });
  if (!user) {
    throw ApiError.notFound("User not found");
  }
  return sanitizeUser(user);
}
