import { apiFetch, setAuthToken, clearAuthToken, getAuthToken } from "./http";
import type { Profile } from "./types";

export interface User {
  id: string;
  email: string;
  role: "farmer" | "admin" | "extension_officer";
  profile: Profile;
  createdAt: string;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  user: User;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  districtId: string;
  areaUnit: "acre" | "bigha";
}

export async function loginUser(input: LoginInput): Promise<User> {
  const res = await apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  setAuthToken(res.accessToken);
  return res.user;
}

export async function registerUser(input: RegisterInput): Promise<User> {
  const res = await apiFetch<TokenResponse>("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  setAuthToken(res.accessToken);
  return res.user;
}

export async function fetchCurrentUser(): Promise<User | null> {
  const token = getAuthToken();
  if (!token) return null;
  try {
    return await apiFetch<User>("/auth/me");
  } catch {
    clearAuthToken();
    return null;
  }
}

export async function updateCurrentUserProfile(profile: Partial<Profile>): Promise<User> {
  return apiFetch<User>("/auth/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
}

export async function deleteCurrentUserAccount(): Promise<void> {
  await apiFetch("/auth/me", { method: "DELETE" });
  clearAuthToken();
}

export function logoutUser(): void {
  clearAuthToken();
}
