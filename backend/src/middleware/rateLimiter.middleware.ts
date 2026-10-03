import rateLimit from "express-rate-limit";

// Tuned to make credential stuffing/brute force impractical without
// blocking a legitimate candidate who mistypes a password a couple of times.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many attempts. Please try again later." } },
});
