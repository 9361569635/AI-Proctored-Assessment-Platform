import { prisma } from "../config/prisma";
import { hashPassword } from "../utils/password";
import { logger } from "../utils/logger";

/**
 * Chicken-and-egg fix: candidate registration only ever creates CANDIDATE
 * users, and MANAGEMENT accounts are created by a SUPER_ADMIN via
 * POST /api/management/users — but nothing creates the first SUPER_ADMIN.
 * Run once per environment: `npm run seed` (from backend/).
 *
 * Idempotent — safe to run again; it no-ops if the account already exists.
 */
async function main() {
   const email = process.env.SUPER_ADMIN_EMAIL?.trim() || "admin@example.com";
   const password = process.env.SUPER_ADMIN_PASSWORD?.trim() || "ChangeMe123!";
   const name = process.env.SUPER_ADMIN_NAME?.trim() || "Super Admin";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    logger.info("Super admin already exists, skipping seed", { email });
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({ data: { name, email, passwordHash, role: "SUPER_ADMIN" } });

  // eslint-disable-next-line no-console
  console.log(
    `\nSuper Admin account created:\n  email:    ${email}\n  password: ${password}\n` +
      (process.env.SUPER_ADMIN_PASSWORD
        ? ""
        : "  (default password — set SUPER_ADMIN_PASSWORD in .env before any real deployment)\n")
  );
}

main()
  .catch((err) => {
    logger.error("Seed failed", { message: err instanceof Error ? err.message : String(err) });
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
