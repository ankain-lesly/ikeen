import axios from "axios";
import { xenv } from "@/lib/env.client";
import { useAuthStore } from "@/lib/stores/auth-store";

export const apiClient = axios.create({
  baseURL: xenv.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Attach JWT access token if available
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle unauthenticated sessions
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear expired auth session
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
