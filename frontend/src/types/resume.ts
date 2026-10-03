export interface ParsedResume {
  candidateName?: string;
  education: Array<{ degree: string; institution: string; year?: string }>;
  skills: string[];
  technicalSkills: string[];
  programmingLanguages: string[];
  frameworks: string[];
  libraries: string[];
  databases: string[];
  tools: string[];
  projects: Array<{ name: string; description: string }>;
  internships: string[];
  experience: Array<{ role: string; company?: string; duration?: string }>;
  certifications: string[];
  achievements: string[];
  technologies: string[];
}

export interface MatchResult {
  matchingSkills: string[];
  missingSkills: string[];
  relevantProjects: string[];
  relevantExperience: string[];
  technicalStrengths: string[];
  technicalGaps: string[];
  resumeRelevance: "High" | "Medium" | "Low";
}

export interface MyResume {
  id: string;
  uploadedAt: string;
  parsedData: ParsedResume | Record<string, never>;
  matchResult: MatchResult | null;
  skills: Array<{ id: string; skill: string; proficiency: string | null }>;
}
