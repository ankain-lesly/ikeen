export interface ChatConversationSummary {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatUIMessage[];
}

export interface ChatConversationDetail {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatUIMessage[];
}

export interface ChatConversationsResponse {
  conversations: ChatConversationSummary[];
  total: number;
}

export interface AgentStatusResponse {
  status: 'active' | 'inactive';
  agent: string;
  tools: string[];
}

export type ChatRole = 'user' | 'assistant' | 'system' | 'data';

export interface ChatToolInvocation {
  state: 'partial-call' | 'call' | 'result';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface ChatUIMessagePart {
  type: string;
  text?: string;
  toolInvocation?: ChatToolInvocation;
  [key: string]: unknown;
}

export interface ChatUIMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string | Date;
  parts?: ChatUIMessagePart[];
  toolInvocations?: ChatToolInvocation[];
}
