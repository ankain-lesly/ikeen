import { create } from "zustand";
import type { UIMessage } from "ai";
import * as Crypto from "expo-crypto";

export interface AgentSessionState {
  id: string;
  title?: string;
  messages: UIMessage[];
  input: string;
  isStreaming: boolean;
}

interface AgentSessionStore {
  session: AgentSessionState;
  setSession: (session: Partial<AgentSessionState> & { id: string }) => void;
  updateTitle: (title: string) => void;
  updateMessages: (messages: UIMessage[]) => void;
  setInput: (input: string) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  resetSession: () => void;
}

const createInitialSession = (): AgentSessionState => ({
  id: Crypto.randomUUID(),
  title: undefined,
  messages: [],
  input: "",
  isStreaming: false,
});

export const useAgentSession = create<AgentSessionStore>((set) => ({
  session: createInitialSession(),

  setSession: (newSession) =>
    set((state) => ({
      session: {
        ...state.session,
        ...newSession,
        title: newSession.title ?? state.session.title,
        messages: newSession.messages ?? state.session.messages,
        input: newSession.input ?? state.session.input,
        isStreaming: false,
      },
    })),

  updateTitle: (title: string) =>
    set((state) => ({
      session: {
        ...state.session,
        title,
      },
    })),

  updateMessages: (messages: UIMessage[]) =>
    set((state) => ({
      session: {
        ...state.session,
        messages,
      },
    })),

  setInput: (input: string) =>
    set((state) => ({
      session: {
        ...state.session,
        input,
      },
    })),

  setIsStreaming: (isStreaming: boolean) =>
    set((state) => ({
      session: {
        ...state.session,
        isStreaming,
      },
    })),

  resetSession: () =>
    set(() => ({
      session: createInitialSession(),
    })),
}));
