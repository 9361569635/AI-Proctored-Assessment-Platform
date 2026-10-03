export type Role = "CANDIDATE" | "MANAGEMENT" | "SUPER_ADMIN";

export interface Candidate {
  id: string;
  phone: string;
  jobRoleId: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  candidate?: Candidate | null;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
  jobRoleId: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
