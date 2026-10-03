import { describe, it, expect } from "vitest";
import {
  SESSION_SEQUENCE,
  GLOBAL_DURATION_SECONDS,
  OVERALL_MIN_SCORE,
  TOTAL_MARKS,
  getSessionConfig,
  getNextSessionConfig,
} from "./assessmentConfig";

describe("assessmentConfig", () => {
  it("totals exactly 100 marks across all 8 sessions (spec §21)", () => {
    expect(TOTAL_MARKS).toBe(100);
    expect(SESSION_SEQUENCE.reduce((sum, s) => sum + s.totalMarks, 0)).toBe(100);
  });

  it("has exactly 8 sessions, numbered 1-8 in order", () => {
    expect(SESSION_SEQUENCE).toHaveLength(8);
    SESSION_SEQUENCE.forEach((s, i) => expect(s.sessionNumber).toBe(i + 1));
  });

  it("global timer is 2 hours 15 minutes (spec §41)", () => {
    expect(GLOBAL_DURATION_SECONDS).toBe(2 * 60 * 60 + 15 * 60);
  });

  it("overall eligibility threshold is 60/100 (spec §22)", () => {
    expect(OVERALL_MIN_SCORE).toBe(60);
  });

  it("marksPerQuestion * questionCount equals totalMarks for every session", () => {
    for (const session of SESSION_SEQUENCE) {
      expect(session.marksPerQuestion * session.questionCount).toBe(session.totalMarks);
    }
  });

  it("matches spec §8-12's minimum eligibility scores where they exist", () => {
    expect(getSessionConfig("APTITUDE").minEligibleScore).toBe(5);
    expect(getSessionConfig("LOGICAL").minEligibleScore).toBe(3);
    expect(getSessionConfig("REASONING").minEligibleScore).toBe(2);
    expect(getSessionConfig("COMMUNICATION").minEligibleScore).toBe(3);
    // Grammar and every coding session have no stated per-session
    // termination rule (spec §12-20) — undefined means "no gate", not zero.
    expect(getSessionConfig("GRAMMAR").minEligibleScore).toBeUndefined();
    expect(getSessionConfig("EASY_CODING").minEligibleScore).toBeUndefined();
    expect(getSessionConfig("MODERATE_CODING").minEligibleScore).toBeUndefined();
    expect(getSessionConfig("HARD_CODING").minEligibleScore).toBeUndefined();
  });

  it("only sessions 1-5 (MCQ/Communication) have a per-session timer — coding sessions are bounded only by the global timer", () => {
    expect(getSessionConfig("APTITUDE").durationSeconds).toBeDefined();
    expect(getSessionConfig("GRAMMAR").durationSeconds).toBeDefined();
    expect(getSessionConfig("EASY_CODING").durationSeconds).toBeUndefined();
    expect(getSessionConfig("MODERATE_CODING").durationSeconds).toBeUndefined();
    expect(getSessionConfig("HARD_CODING").durationSeconds).toBeUndefined();
  });

  it("getNextSessionConfig walks the sequence and returns undefined after the last session", () => {
    expect(getNextSessionConfig(1)?.sessionType).toBe("LOGICAL");
    expect(getNextSessionConfig(7)?.sessionType).toBe("HARD_CODING");
    expect(getNextSessionConfig(8)).toBeUndefined();
  });

  it("getSessionConfig throws for an unconfigured session type", () => {
    // @ts-expect-error — deliberately passing an invalid value to verify the runtime guard
    expect(() => getSessionConfig("NOT_A_SESSION")).toThrow();
  });
});
