/* eslint-disable no-console */

/**
 * Thin logging facade. Every call site imports `logger` from here rather
 * than calling `console` directly, so swapping in pino/winston later is a
 * one-file change. Deliberately dependency-free for Phase 1.
 */
export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: "info", msg, ...meta, time: new Date().toISOString() })),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(JSON.stringify({ level: "warn", msg, ...meta, time: new Date().toISOString() })),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(JSON.stringify({ level: "error", msg, ...meta, time: new Date().toISOString() })),
};
