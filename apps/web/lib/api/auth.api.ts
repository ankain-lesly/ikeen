import { apiClient } from "./api-client";
import type { AuthUser } from "@/lib/stores/auth-store";

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
  const { data } = await apiClient.post<AuthResponse>("/api/v1/auth/login", dto);
  return data;
}

export async function registerApi(dto: RegisterDto): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/v1/auth/register", dto);
  return data;
}

export async function getProfileApi(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/api/v1/auth/me");
  return data;
}
