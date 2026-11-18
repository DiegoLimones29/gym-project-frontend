import { api } from "../../api/client";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  roleId: number;
  role?: string;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export interface RoleOption {
  id: number;
  name: string;
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId: number;
}

export interface CreateMemberProfilePayload {
  userId: string;
  phone: string;
  birthDate: string;
  emergencyContactPhone?: string;
}

export interface CreateWorkerProfilePayload {
  userId: string;
  area: string;
  shift: string;
}

export async function loginRequest(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", credentials);
  return data;
}

export async function fetchRolesRequest(): Promise<RoleOption[]> {
  const { data } = await api.get("/roles");
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : [];

  return list.map((r: { id: number; role: string }) => ({
    id: r.id,
    name: r.role,
  }));
}

export async function createUserRequest(
  payload: CreateUserPayload,
): Promise<AuthUser> {
  const { data } = await api.post("/users", payload);
  return data.data ?? data;
}

export async function createMemberProfileRequest(
  payload: CreateMemberProfilePayload,
) {
  const { data } = await api.post("/members-profile", payload);
  return data;
}

export async function createWorkerProfileRequest(
  payload: CreateWorkerProfilePayload,
) {
  const { data } = await api.post("/worker-profile", payload);
  return data;
}
