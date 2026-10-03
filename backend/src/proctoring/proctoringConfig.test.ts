import { describe, it, expect } from "vitest";
import { getPolicy, POLICY_BY_EVENT_TYPE, PROCTORING_EVENT_TYPES } from "./proctoringConfig";

describe("proctoringConfig", () => {
  it("every declared event type has an explicit policy entry", () => {
    for (const type of PROCTORING_EVENT_TYPES) {
      expect(POLICY_BY_EVENT_TYPE[type]).toBeDefined();
    }
  });

  it("every policy's thresholds are strictly increasing (warn < violation < terminate)", () => {
    for (const type of PROCTORING_EVENT_TYPES) {
      const policy = getPolicy(type);
      expect(policy.warnAt).toBeLessThan(policy.violationAt);
      expect(policy.violationAt).toBeLessThan(policy.terminateAt);
    }
  });

  it("falls back to a sane default for an unrecognized event type rather than throwing", () => {
    const policy = getPolicy("SOME_FUTURE_EVENT_TYPE_NOT_YET_DEFINED");
    expect(policy.warnAt).toBeLessThan(policy.violationAt);
    expect(policy.violationAt).toBeLessThan(policy.terminateAt);
  });

  it("clipboard and multi-face events escalate to termination faster than no-face/voice (spec §31 vs §32)", () => {
    expect(getPolicy("COPY_ATTEMPT").terminateAt).toBeLessThan(getPolicy("NO_FACE").terminateAt);
    expect(getPolicy("MULTI_FACE").terminateAt).toBeLessThan(getPolicy("VOICE_ANOMALY").terminateAt);
  });

  it("no-face requires more than one occurrence before even a warning (spec §32: don't flag one temporary failure)", () => {
    expect(getPolicy("NO_FACE").warnAt).toBeGreaterThan(1);
  });
});
