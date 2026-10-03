import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const enabled = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!enabled)("database integration", () => {
  it("can connect and read the Prisma schema", async () => {
    const prisma = new PrismaClient();
    try {
      const rows = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
      expect(rows[0]?.ok).toBe(1);
    } finally {
      await prisma.$disconnect();
    }
  });
});
