import { apiClient } from "../api-client";

export interface McpToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface McpToolItem {
  name: string;
  description: string;
  category: "notes" | "folders";
  parameters: McpToolParameter[];
}

export interface McpServerInfo {
  name: string;
  version: string;
  protocolVersion: string;
  transport: string;
  endpoint: string;
  toolsCount: number;
  promptsCount?: number;
}

export interface McpPromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface McpPromptItem {
  name: string;
  description: string;
  arguments: McpPromptArgument[];
}

export async function fetchMcpToolsApi(): Promise<McpToolItem[]> {
  const { data } = await apiClient.get<McpToolItem[]>("/api/v1/mcp/tools");
  return data;
}

export async function fetchMcpPromptsApi(): Promise<McpPromptItem[]> {
  const { data } = await apiClient.get<McpPromptItem[]>("/api/v1/mcp/prompts");
  return data;
}

export async function fetchMcpInfoApi(): Promise<McpServerInfo> {
  const { data } = await apiClient.get<McpServerInfo>("/api/v1/mcp/info");
  return data;
}


