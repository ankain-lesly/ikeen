import { apiClient } from "../api-client";

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateKeyDto {
  name: string;
  expiresInDays?: number | null;
}

export interface CreateKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  rawKey: string;
  apiKey: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface RevokeKeyResponse {
  ok: boolean;
  revokedId: string;
  success: boolean;
  id: string;
}

export async function fetchKeysApi(): Promise<ApiKeyItem[]> {
  const { data } = await apiClient.get<ApiKeyItem[]>("/api/v1/auth/api-keys");
  return data;
}

export async function createKeyApi(dto: CreateKeyDto): Promise<CreateKeyResponse> {
  const payload: { name: string; expiresInDays?: number } = {
    name: dto.name.trim(),
  };

  if (typeof dto.expiresInDays === "number" && dto.expiresInDays > 0) {
    payload.expiresInDays = dto.expiresInDays;
  }

  const { data } = await apiClient.post<CreateKeyResponse>("/api/v1/auth/api-keys", payload);

  return data;
}

export async function revokeKeyApi(keyId: string): Promise<RevokeKeyResponse> {
  const { data } = await apiClient.delete<{
    ok?: boolean;
    revokedId?: string;
    success?: boolean;
    id?: string;
  }>(`/api/v1/auth/api-keys/${keyId}`);

  const id = data.revokedId || data.id || keyId;
  const isOk = data.ok ?? data.success ?? true;

  return {
    ok: isOk,
    revokedId: id,
    success: isOk,
    id,
  };
}
