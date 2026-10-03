import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

/**
 * Every per-session submission endpoint (coding submit/run, audio response)
 * needs this same check before touching anything — centralized so it's one
 * place to get right rather than a copy in each module.
 */
export async function assertOwnedActiveSession(candidateId: string, sessionId: string) {
  const session = await prisma.assessmentSession.findFirst({
    where: { id: sessionId, assessment: { candidateId } },
  });
  if (!session) throw ApiError.notFound("Session not found");
  if (session.status !== "IN_PROGRESS") {
    throw ApiError.forbidden("This session is not currently active");
  }
  return session;
}
