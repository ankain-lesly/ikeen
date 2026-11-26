"use client";

import * as React from "react";
import type { TextBlock } from "@repo/types";
import { Textarea } from "@/components/ui/textarea";

interface TextBlockEditorProps {
  block: TextBlock;
  onCommit: (content: string) => void;
}

function SimpleMarkdownPreview({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <p className="text-sm italic text-muted-foreground">Empty text block</p>
    );
  }

  return (
    <div className="space-y-2 text-sm leading-relaxed text-foreground/95 whitespace-pre-wrap break-words">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("### ")) {
          return (
            <h4 key={i} className="font-heading text-base font-bold pt-1">
              {line.slice(4)}
            </h4>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} className="font-heading text-lg font-bold pt-1">
              {line.slice(3)}
            </h3>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h2 key={i} className="font-heading text-xl font-bold pt-1">
              {line.slice(2)}
            </h2>
          );
        }
        return <p key={i}>{line || "\u00A0"}</p>;
      })}
    </div>
  );
}

export function TextBlockEditor({ block, onCommit }: TextBlockEditorProps) {
  const [draft, setDraft] = React.useState<string | null>(null);
  const [isPreview, setIsPreview] = React.useState(false);
  const value = draft ?? block.content;

  function handleBlur() {
    if (draft !== null && draft !== block.content) {
      onCommit(draft);
    }
    setDraft(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => {
            if (!isPreview && draft !== null && draft !== block.content) {
              onCommit(draft);
              setDraft(null);
            }
            setIsPreview((p) => !p);
          }}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {isPreview ? "Edit" : "Preview"}
        </button>
      </div>

      {isPreview ? (
        <div
          onClick={() => setIsPreview(false)}
          className="min-h-[60px] cursor-text rounded-lg p-1"
        >
          <SimpleMarkdownPreview content={value} />
        </div>
      ) : (
        <Textarea
          value={value}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          placeholder="Write markdown or plain text..."
          rows={Math.max(3, value.split("\n").length + 1)}
          className="resize-y border-0 bg-transparent px-0 py-1 text-sm leading-relaxed focus-visible:ring-0"
        />
      )}
    </div>
  );
}
