import { CheckSquare, FileText, Square } from "lucide-react";
import type { NoteBlock } from "@repo/types";

interface SharedNoteBlocksProps {
  blocks: NoteBlock[];
  hideEmptyFallback?: boolean;
}

export function SharedNoteBlocks({
  blocks,
  hideEmptyFallback = false,
}: SharedNoteBlocksProps) {
  if (blocks.length === 0) {
    if (hideEmptyFallback) return null;
    return (
      <p className="text-sm text-muted-foreground italic py-4">
        This note has no content yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {blocks.map((block) => {
        if (block.type === "text") {
          return (
            <div
              key={block.id}
              className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/95"
            >
              {block.content}
            </div>
          );
        }

        if (block.type === "list") {
          return (
            <div key={block.id} className="space-y-2">
              {block.header && (
                <h3 className="text-sm font-semibold text-foreground">
                  {block.header}
                </h3>
              )}
              <ul className="space-y-1.5">
                {block.content.map((item, idx) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-2.5 text-[15px] leading-relaxed"
                  >
                    {block.listType === "checkbox" ? (
                      item.checked ? (
                        <CheckSquare className="mt-1 size-4 shrink-0 text-primary" />
                      ) : (
                        <Square className="mt-1 size-4 shrink-0 text-muted-foreground" />
                      )
                    ) : block.listType === "ordered" ? (
                      <span className="mt-0.5 min-w-[1.25rem] text-xs font-mono text-muted-foreground">
                        {idx + 1}.
                      </span>
                    ) : (
                      <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/70" />
                    )}
                    <span
                      className={
                        block.listType === "checkbox" && item.checked
                          ? "line-through text-muted-foreground"
                          : "text-foreground/95"
                      }
                    >
                      {item.content}
                    </span>
                  </li>
                ))}
              </ul>
              {block.footer && (
                <p className="text-xs text-muted-foreground">{block.footer}</p>
              )}
            </div>
          );
        }

        if (block.type === "media") {
          const validItems = block.content.filter((item) => Boolean(item.url));
          if (validItems.length === 0) return null;

          return (
            <div key={block.id} className="space-y-4">
              {validItems.map((item) => (
                <figure key={item.id} className="space-y-1.5">
                  {item.mediaType === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.caption ?? item.name ?? "Shared attachment"}
                      className="max-h-[520px] w-auto rounded-xl border border-border/70 object-contain"
                      loading="lazy"
                    />
                  ) : item.mediaType === "audio" ? (
                    <audio controls src={item.url} className="w-full" />
                  ) : (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted/50 transition-colors"
                    >
                      <FileText className="size-4 text-muted-foreground" />
                      <span>{item.name ?? "Download attachment"}</span>
                    </a>
                  )}
                  {item.caption && (
                    <figcaption className="text-xs text-muted-foreground">
                      {item.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
