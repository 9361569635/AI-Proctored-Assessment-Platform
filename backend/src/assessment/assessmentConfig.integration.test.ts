import { describe, expect, it } from "vitest";
import { SESSION_SEQUENCE, TOTAL_MARKS, GLOBAL_DURATION_SECONDS } from "./assessmentConfig";

describe("assessment configuration integration smoke checks", () => {
  it("matches the required eight-session 100-mark flow", () => {
    expect(SESSION_SEQUENCE.map(s => s.sessionType)).toEqual(["APTITUDE","LOGICAL","REASONING","COMMUNICATION","GRAMMAR","EASY_CODING","MODERATE_CODING","HARD_CODING"]);
    expect(TOTAL_MARKS).toBe(100); expect(GLOBAL_DURATION_SECONDS).toBe(8100);
  });
});
