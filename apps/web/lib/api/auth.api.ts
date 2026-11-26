import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import {
  authResponseSchema,
  authUserSchema,
  loginInputSchema,
  registerInputSchema,
} from "./schemas";
import { useAuthStore, type AuthUser } from "@/lib/stores/auth-store";

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

export const authKeys = {
  all: ["auth"] as const,
  profile: () => [...authKeys.all, "profile"] as const,
};

export async function loginApi(dto: LoginDto): Promise<AuthResponse> {
  const payload = loginInputSchema.parse(dto);
  const { data } = await apiClient.post("/api/v1/auth/login", payload);
  return authResponseSchema.parse(data);
}

export async function registerApi(dto: RegisterDto): Promise<AuthResponse> {
  const payload = registerInputSchema.parse(dto);
  const { data } = await apiClient.post("/api/v1/auth/register", payload);
  return authResponseSchema.parse(data);
}

export async function getProfileApi(): Promise<AuthUser> {
  const { data } = await apiClient.get("/api/v1/auth/me");
  return authUserSchema.parse(data);
}

export function useProfile(enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: authKeys.profile(),
    queryFn: getProfileApi,
    enabled: enabled && isAuthenticated,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      queryClient.invalidateQueries();
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: registerApi,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      queryClient.invalidateQueries();
    },
  });
}
