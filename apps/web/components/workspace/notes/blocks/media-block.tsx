"use client";

import * as React from "react";
import { nanoid } from "nanoid";
import toast from "react-hot-toast";
import {
  FileText,
  Image as ImageIcon,
  Music,
  Upload,
  X,
  ExternalLink,
} from "lucide-react";
import type { MediaBlock, MediaItem, MediaType } from "@repo/types";

import { useUploadMedia } from "@/lib/api/media.api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface MediaBlockEditorProps {
  block: MediaBlock;
  onCommit: (items: MediaItem[]) => void;
}

function inferMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}

export function MediaBlockEditor({ block, onCommit }: MediaBlockEditorProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const uploadMedia = useUploadMedia();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    uploadMedia.mutate(
      { file, folder: "notes" },
      {
        onSuccess: (uploaded) => {
          const nextItem: MediaItem = {
            id: uploaded.id || nanoid(10),
            mediaType: inferMediaType(uploaded.mime_type),
            name: uploaded.original_filename || file.name,
            url: uploaded.url,
            metadata: {
              size: uploaded.size,
              mimeType: uploaded.mime_type,
            },
          };
          onCommit([...block.content, nextItem]);
          toast.success("Media uploaded");
        },
        onError: () => toast.error("Failed to upload file"),
      },
    );
  }

  function handleRemove(itemId: string) {
    onCommit(block.content.filter((item) => item.id !== itemId));
  }

  return (
    <div className="space-y-3">
      {block.content.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {block.content.map((item) => (
            <div
              key={item.id}
              className="group/media relative overflow-hidden rounded-lg border border-border bg-background"
            >
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                aria-label={`Remove ${item.name || "attachment"}`}
                className="absolute right-2 top-2 z-10 rounded bg-background/85 p-1 text-muted-foreground opacity-0 transition-opacity group-hover/media:opacity-100 hover:text-destructive cursor-pointer"
              >
                <X className="size-3.5" />
              </button>

              {item.mediaType === "image" && item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.name || "Attachment"}
                    className="h-44 w-full object-cover"
                  />
                </a>
              ) : item.mediaType === "audio" && item.url ? (
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-foreground">
                    <Music className="size-3.5 text-primary shrink-0" />
                    <span className="truncate">{item.name || "Audio"}</span>
                  </div>
                  <audio controls src={item.url} className="w-full h-8" />
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="flex min-w-0 items-center gap-2 text-xs text-foreground">
                    {item.mediaType === "image" ? (
                      <ImageIcon className="size-4 text-primary shrink-0" />
                    ) : (
                      <FileText className="size-4 text-primary shrink-0" />
                    )}
                    <span className="truncate">
                      {item.name || item.mediaType}
                    </span>
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open attachment"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              )}

              {item.mediaType === "image" && (
                <div className="border-t border-border/60 px-2.5 py-1.5 text-[11px] text-muted-foreground truncate">
                  {item.name || "Image"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,audio/*,.pdf,.txt,.md,.json,.csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploadMedia.isPending}
          onClick={() => inputRef.current?.click()}
          className="h-8 gap-1.5 text-xs"
        >
          {uploadMedia.isPending ? (
            <Spinner className="size-3.5" />
          ) : (
            <Upload className="size-3.5" />
          )}
          <span>
            {uploadMedia.isPending ? "Uploading…" : "Upload Image or File"}
          </span>
        </Button>
      </div>
    </div>
  );
}
