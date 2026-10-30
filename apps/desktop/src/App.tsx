import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Note, Folder } from "@repo/types";
import { formatDate } from "@repo/utils";
import {
  FileText,
  Folder as FolderIcon,
  Search,
  Sparkles,
  Zap,
  Terminal,
  Settings,
  Plus,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

const INITIAL_FOLDERS: Folder[] = [
  {
    id: "folder-1",
    name: "General",
    color: "#3b82f6",
    icon: "folder",
    isLocked: false,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "folder-2",
    name: "Ideas & Architecture",
    color: "#39ff14",
    icon: "lightbulb",
    isLocked: false,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_NOTES: Note[] = [
  {
    id: "note-1",
    title: "Tauri v2 Desktop Architecture",
    content: "Local-first desktop client running on embedded SQLite with zero-latency FTS5 and MCP sidecar orchestration.",
    tags: ["architecture", "tauri", "desktop"],
    isPinned: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "note-2",
    title: "Fast Keyboard Ergonomics",
    content: "Global Quick-Capture HUD summoned via Cmd+Shift+Space, non-blocking sync outbox queue.",
    tags: ["ux", "shortcuts"],
    isPinned: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function App() {
  const [notes] = useState<Note[]>(INITIAL_NOTES);
  const [folders] = useState<Folder[]>(INITIAL_FOLDERS);
  const [activeNoteId, setActiveNoteId] = useState<string>("note-1");
  const [rustGreeting, setRustGreeting] = useState<string>("Connecting to Tauri...");
  const [ipcConnected, setIpcConnected] = useState<boolean>(false);

  useEffect(() => {
    invoke<string>("greet", { name: "iKeen Desktop Shell" })
      .then((res) => {
        setRustGreeting(res);
        setIpcConnected(true);
      })
      .catch((err) => {
        setRustGreeting(`IPC Ready: ${String(err)}`);
      });
  }, []);

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0a] text-[#f2f5ef]">
      {/* 1. Left Navigation Sidebar */}
      <aside className="w-64 border-r border-[#262626] bg-[#111111] flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-[#262626]">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#39ff14] shadow-[0_0_8px_#39ff14]" />
              <span className="font-semibold text-sm tracking-wide">iKeen Desktop</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#1f1f1f] text-[#39ff14] border border-[#39ff14]/30">
              v2 Core
            </span>
          </div>

          {/* Quick Actions */}
          <div className="p-3">
            <button className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded bg-[#39ff14] text-black font-medium text-xs hover:bg-[#32e012] transition-colors cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>New Note</span>
              <kbd className="ml-auto text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-mono">⌘N</kbd>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-2 space-y-1">
            <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-xs bg-[#1f1f1f] text-white font-medium">
              <FileText className="w-4 h-4 text-[#39ff14]" />
              <span>All Notes</span>
              <span className="ml-auto text-[11px] text-[#8a8a8a]">{notes.length}</span>
            </button>
            <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-xs text-[#8a8a8a] hover:bg-[#1a1a1a] hover:text-white transition-colors">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>AI Memories</span>
            </button>
            <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-xs text-[#8a8a8a] hover:bg-[#1a1a1a] hover:text-white transition-colors">
              <Terminal className="w-4 h-4 text-sky-400" />
              <span>MCP Tools</span>
            </button>
          </nav>

          {/* Folders List */}
          <div className="mt-5 px-3">
            <p className="text-[10px] uppercase tracking-wider font-mono text-[#8a8a8a] px-2 mb-1">
              Folders
            </p>
            <div className="space-y-0.5">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-[#8a8a8a] hover:bg-[#1a1a1a] hover:text-white transition-colors"
                >
                  <FolderIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span className="truncate">{folder.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#262626] bg-[#0d0d0d] flex items-center justify-between text-xs text-[#8a8a8a]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#39ff14]" />
            <span className="text-[11px]">Local-First (SQLite)</span>
          </div>
          <Settings className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
        </div>
      </aside>

      {/* 2. Middle Notes List Pane */}
      <section className="w-80 border-r border-[#262626] bg-[#0d0d0d] flex flex-col">
        {/* Search header */}
        <div className="h-14 px-4 border-b border-[#262626] flex items-center gap-2">
          <Search className="w-4 h-4 text-[#8a8a8a]" />
          <input
            type="text"
            placeholder="Search notes (FTS5)..."
            className="w-full bg-transparent text-xs text-white placeholder-[#8a8a8a] outline-none"
          />
          <kbd className="text-[10px] text-[#8a8a8a] font-mono border border-[#262626] px-1 rounded">
            ⌘K
          </kbd>
        </div>

        {/* Notes Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1f1f1f]">
          {notes.map((note) => {
            const isActive = note.id === activeNoteId;
            return (
              <div
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={`p-3.5 cursor-pointer transition-colors ${
                  isActive ? "bg-[#171717] border-l-2 border-[#39ff14]" : "hover:bg-[#121212]"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <h3 className="text-xs font-semibold text-white truncate">{note.title}</h3>
                  {note.isPinned && <Zap className="w-3 h-3 text-[#39ff14] shrink-0" />}
                </div>
                <p className="text-[11px] text-[#8a8a8a] line-clamp-2 leading-relaxed mb-2">
                  {note.content}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-[#8a8a8a]">
                  <span>{formatDate(new Date(note.updatedAt))}</span>
                  <div className="flex gap-1">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.2 rounded bg-[#1f1f1f] text-[#39ff14] text-[9px]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Main Workspace / Editor Canvas Pane */}
      <main className="flex-1 flex flex-col bg-[#0a0a0a]">
        {/* Top Status Bar */}
        <header className="h-14 px-6 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-wide">
              {activeNote ? activeNote.title : "No note selected"}
            </h2>
            <span className="text-[11px] text-[#8a8a8a] font-mono">
              Last saved {activeNote ? formatDate(new Date(activeNote.updatedAt)) : ""}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#171717] border border-[#262626] text-[11px]">
              <CheckCircle2
                className={`w-3.5 h-3.5 ${ipcConnected ? "text-[#39ff14]" : "text-amber-400"}`}
              />
              <span className="text-xs font-mono">{ipcConnected ? "Rust IPC Active" : "Tauri Core"}</span>
            </div>
          </div>
        </header>

        {/* Editor Body */}
        <div className="flex-1 p-8 max-w-3xl overflow-y-auto">
          {activeNote && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-white tracking-tight">{activeNote.title}</h1>
              <div className="prose prose-invert max-w-none text-sm text-[#cccccc] leading-relaxed whitespace-pre-wrap">
                {activeNote.content}
              </div>

              {/* IPC Greeting Banner */}
              <div className="mt-12 p-4 rounded-lg bg-[#141414] border border-[#262626] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#39ff14]">
                  <Terminal className="w-4 h-4" />
                  <span>Tauri v2 IPC Bridge Diagnostic</span>
                </div>
                <p className="text-xs font-mono text-[#8a8a8a]">{rustGreeting}</p>
                <p className="text-[11px] text-[#8a8a8a]">
                  Dual-window configuration active: Main window (1280x840) & Quick-Capture HUD ready for global shortcut binding.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
