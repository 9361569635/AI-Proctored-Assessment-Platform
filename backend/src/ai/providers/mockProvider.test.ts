import { describe, it, expect } from "vitest";
import { MockAIProvider } from "./mockProvider";
import type { ParsedResume } from "../types";

const provider = new MockAIProvider();

function emptyResume(overrides: Partial<ParsedResume> = {}): ParsedResume {
  return {
    education: [],
    skills: [],
    technicalSkills: [],
    programmingLanguages: [],
    frameworks: [],
    libraries: [],
    databases: [],
    tools: [],
    projects: [],
    internships: [],
    experience: [],
    certifications: [],
    achievements: [],
    technologies: [],
    ...overrides,
  };
}

describe("MockAIProvider.extractResume", () => {
  it("detects known skills mentioned in the resume text", async () => {
    const result = await provider.extractResume("Experienced with Python, React, and PostgreSQL. Built a Docker pipeline.");
    expect(result.programmingLanguages).toContain("Python");
    expect(result.frameworks).toContain("React");
    expect(result.databases).toContain("PostgreSQL");
    expect(result.tools).toContain("Docker");
  });

  it("returns empty arrays when no known skills are present", async () => {
    const result = await provider.extractResume("A short bio with no relevant keywords whatsoever.");
    expect(result.skills).toEqual([]);
    expect(result.programmingLanguages).toEqual([]);
  });
});

describe("MockAIProvider.matchJobDescription", () => {
  it("computes High relevance when all required skills are present", async () => {
    const resume = emptyResume({ skills: ["Python", "SQL", "REST API"] });
    const result = await provider.matchJobDescription(resume, {
      title: "Backend Developer",
      description: "...",
      requiredSkills: ["Python", "SQL", "REST API"],
      preferredSkills: [],
    });
    expect(result.resumeRelevance).toBe("High");
    expect(result.missingSkills).toEqual([]);
  });

  it("computes Low relevance and lists missing skills when few required skills match", async () => {
    const resume = emptyResume({ skills: ["Python"] });
    const result = await provider.matchJobDescription(resume, {
      title: "Backend Developer",
      description: "...",
      requiredSkills: ["Python", "SQL", "REST API", "Kubernetes", "AWS"],
      preferredSkills: [],
    });
    expect(result.resumeRelevance).toBe("Low");
    expect(result.missingSkills).toEqual(expect.arrayContaining(["SQL", "REST API", "Kubernetes", "AWS"]));
  });

  it("matching is case-insensitive", async () => {
    const resume = emptyResume({ skills: ["python", "sql"] });
    const result = await provider.matchJobDescription(resume, {
      title: "Dev",
      description: "...",
      requiredSkills: ["Python", "SQL"],
      preferredSkills: [],
    });
    expect(result.missingSkills).toEqual([]);
  });
});

describe("MockAIProvider.analyzeCommunication", () => {
  it("scores a verbatim repeat near-perfectly", async () => {
    const reference = "Please send me the report before the end of the day.";
    const result = await provider.analyzeCommunication(reference, reference);
    expect(result.wordAccuracy).toBe(1);
    expect(result.missingWords).toEqual([]);
    expect(result.score).toBeGreaterThan(0.9);
  });

  it("scores an empty transcript (e.g. mock STT, or the candidate said nothing) as zero", async () => {
    const result = await provider.analyzeCommunication("", "Please send me the report before the end of the day.");
    expect(result.wordAccuracy).toBe(0);
    expect(result.score).toBe(0);
    expect(result.missingWords.length).toBeGreaterThan(0);
  });

  it("identifies specific missing and additional words for a partial repeat", async () => {
    const result = await provider.analyzeCommunication(
      "Please send the report today",
      "Please send me the report before the end of the day"
    );
    // "the" appears in both, so it's not missing even though the reference
    // repeats it 3 times — only words absent from the transcript entirely count.
    expect(result.missingWords).toEqual(expect.arrayContaining(["me", "before", "end", "of", "day"]));
    expect(result.missingWords).not.toContain("the");
    expect(result.additionalWords).toEqual(expect.arrayContaining(["today"]));
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1);
  });

  it("is case-insensitive and ignores punctuation", async () => {
    const result = await provider.analyzeCommunication("HELLO, WORLD!", "hello world");
    expect(result.wordAccuracy).toBe(1);
  });
});

describe("MockAIProvider.analyzeCandidate", () => {
  const baseSummary = {
    totalScore: 90,
    eligibility: "ELIGIBLE",
    sessionScores: { easyCoding: 20, moderateCoding: 20, hardCoding: 30 },
    resumeRelevance: "High",
  };

  it("recommends Not Recommended for a non-eligible candidate regardless of score", async () => {
    const result = await provider.analyzeCandidate({ ...baseSummary, totalScore: 95, eligibility: "NOT_ELIGIBLE" });
    expect(result.recommendation).toBe("Not Recommended");
  });

  it("recommends Strongly Recommended for a high-scoring eligible candidate with low proctoring risk", async () => {
    const result = await provider.analyzeCandidate({ ...baseSummary, proctoringRisk: "Low" });
    expect(result.recommendation).toBe("Strongly Recommended");
  });

  it("caps the recommendation at Consider when proctoring risk is High, even with a great score", async () => {
    const result = await provider.analyzeCandidate({ ...baseSummary, proctoringRisk: "High" });
    expect(result.recommendation).toBe("Consider");
  });

  it("never overrides Not Recommended with a proctoring-risk cap upgrade", async () => {
    const result = await provider.analyzeCandidate({
      ...baseSummary,
      eligibility: "NOT_ELIGIBLE",
      proctoringRisk: "Critical",
    });
    expect(result.recommendation).toBe("Not Recommended");
  });
});
