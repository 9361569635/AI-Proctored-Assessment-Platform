import { prisma } from "../config/prisma";
export async function writeAuditLog(input: { userId?: string; action: string; entity: string; entityId?: string; metadata?: Record<string, unknown> }) {
  await prisma.auditLog.create({ data: { userId: input.userId, action: input.action, entity: input.entity, entityId: input.entityId, metadata: input.metadata as object | undefined } });
}
