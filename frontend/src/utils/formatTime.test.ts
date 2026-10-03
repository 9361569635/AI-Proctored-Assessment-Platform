import { describe, expect, it } from "vitest";
import { formatSeconds } from "./formatTime";

describe("formatSeconds", () => {
  it("formats assessment timers", () => {
    expect(formatSeconds(0)).toBe("00:00");
    expect(formatSeconds(65)).toBe("01:05");
    expect(formatSeconds(3661)).toBe("01:01:01");
  });
});
