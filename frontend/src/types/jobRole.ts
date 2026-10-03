export interface JobRoleRequirements {
  requiredSkills: string[];
  preferredSkills: string[];
  minExperienceYears?: number;
}

export interface JobRole {
  id: string;
  title: string;
  description: string;
  requirements: JobRoleRequirements;
  createdAt: string;
  updatedAt: string;
}
