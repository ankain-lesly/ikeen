import { syncApi } from "@/lib/sync/sync-api";
import type { AuthUser } from "@/stores/use-auth-store";

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export async function loginApi(dto: LoginDto): Promise<AuthResponse> {
  const url = `${syncApi.getBaseUrl()}/auth/login`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(dto),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Login failed (${response.status})`;
    throw new Error(Array.isArray(errorMsg) ? errorMsg.join(", ") : errorMsg);
  }

  return data as AuthResponse;
}

export async function registerApi(dto: RegisterDto): Promise<AuthResponse> {
  const url = `${syncApi.getBaseUrl()}/auth/register`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(dto),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Registration failed (${response.status})`;
    throw new Error(Array.isArray(errorMsg) ? errorMsg.join(", ") : errorMsg);
  }

  return data as AuthResponse;
}

export async function getProfileApi(): Promise<AuthUser> {
  const token = syncApi.getToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const url = `${syncApi.getBaseUrl()}/auth/me`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Failed to fetch profile");
  }

  return data as AuthUser;
}
