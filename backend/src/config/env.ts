import "dotenv/config";
import { z } from "zod";

/**
 * All environment configuration is validated here, once, at process start.
 * Every other module imports `env` from this file instead of touching
 * `process.env` directly — this is what makes the rest of the codebase
 * safe to `strict`-typecheck and easy to test.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // Used by AI-driven modules (resume extraction, question generation,
  // communication/candidate analysis). "mock" needs no key and is the
  // default so the app runs out of the box; switch to "anthropic" once
  // AI_API_KEY is set.
  AI_PROVIDER: z.enum(["anthropic", "gemini", "mock"]).default("mock"),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("claude-sonnet-5"),

  // Speech-to-text for the Communication session (spec §11). Separate
  // provider/key from AI_PROVIDER above — Anthropic doesn't offer STT, so
  // the real option here is OpenAI's Whisper API. "mock" (default) returns
  // an empty transcript rather than faking one — see MockSpeechProvider.
  SPEECH_PROVIDER: z.enum(["openai", "gemini", "mock"]).default("mock"),
  SPEECH_API_KEY: z.string().optional(),

  // Local-disk storage for Phase-2 resume uploads. Swap for the
  // STORAGE_*/cloud provider below once a bucket is provisioned — the
  // StorageProvider interface (backend/src/storage) is what makes that a
  // one-file change.
  STORAGE_ROOT: z.string().default("./uploads"),
  STORAGE_API_KEY: z.string().optional(),
  STORAGE_SECRET: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Intentionally crash on boot rather than run with bad config.
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

if (isProd) {
  if (env.AI_PROVIDER !== "anthropic" || !env.AI_API_KEY) throw new Error("Production requires AI_PROVIDER=anthropic and AI_API_KEY");
  if (env.SPEECH_PROVIDER !== "openai" || !env.SPEECH_API_KEY) throw new Error("Production requires SPEECH_PROVIDER=openai and SPEECH_API_KEY");
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) throw new Error("JWT access and refresh secrets must differ");
}

