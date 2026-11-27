"use client";

import * as React from "react";
import { nanoid } from "nanoid";
import { Check, Plus, X } from "lucide-react";
import type { ListBlock, ListItem, ListType } from "@repo/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ListBlockEditorProps {
  block: ListBlock;
  onCommit: (patch: {
    listType: ListType;
    header: string | null;
    footer: string | null;
    content: ListItem[];
  }) => void;
}

const LIST_LABELS: Record<ListType, string> = {
  checkbox: "Checklist",
  bullet: "Bullets",
  ordered: "Numbered",
};

export function ListBlockEditor({ block, onCommit }: ListBlockEditorProps) {
  const [headerDraft, setHeaderDraft] = React.useState<string | null>(null);
  const [footerDraft, setFooterDraft] = React.useState<string | null>(null);
  const [itemDrafts, setItemDrafts] = React.useState<Record<string, string>>(
    {},
  );
  const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const header = headerDraft ?? block.header ?? "";
  const footer = footerDraft ?? block.footer ?? "";
  const items = React.useMemo(
    () =>
      block.content.map((item) =>
        item.id in itemDrafts
          ? { ...item, content: itemDrafts[item.id] }
          : item,
      ),
    [block.content, itemDrafts],
  );

  function emit(
    nextItems: ListItem[],
    nextType: ListType = block.listType,
    nextHeader: string = header,
    nextFooter: string = footer,
  ) {
    onCommit({
      listType: nextType,
      header: nextHeader.trim() ? nextHeader.trim() : null,
      footer: nextFooter.trim() ? nextFooter.trim() : null,
      content: nextItems,
    });
  }

  function handleToggleCheck(itemId: string) {
    const next = items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item,
    );
    emit(next);
  }

  function handleItemBlur(itemId: string) {
    if (!(itemId in itemDrafts)) return;
    const nextItems = items;
    setItemDrafts((prev) => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
    emit(nextItems);
  }

  function handleAddItem(afterIndex?: number) {
    const newId = nanoid(10);
    const newItem: ListItem = { id: newId, content: "", checked: false };
    const next = [...items];
    if (afterIndex !== undefined) {
      next.splice(afterIndex + 1, 0, newItem);
    } else {
      next.push(newItem);
    }
    setItemDrafts({});
    emit(next);
    requestAnimationFrame(() => {
      inputRefs.current[newId]?.focus();
    });
  }

  function handleRemoveItem(itemId: string) {
    setItemDrafts((prev) => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
    emit(items.filter((item) => item.id !== itemId));
  }

  function handleTypeChange(value: string | null) {
    if (!value) return;
    emit(items, value as ListType);
  }

  return (
    <div className="space-y-2.5">
      {/* Header + List Type switcher */}
      <div className="flex items-center justify-between gap-2">
        <Input
          value={header}
          onChange={(e) => setHeaderDraft(e.target.value)}
          onBlur={() => {
            if (headerDraft !== null) {
              emit(items, block.listType, headerDraft, footer);
              setHeaderDraft(null);
            }
          }}
          placeholder="List title (optional)"
          className="h-7 border-0 bg-transparent px-0 text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0"
        />

        <Select value={block.listType} onValueChange={handleTypeChange}>
          <SelectTrigger size="sm" aria-label="List style" className="text-[11px]">
            <SelectValue>{LIST_LABELS[block.listType]}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="checkbox">Checklist</SelectItem>
            <SelectItem value="bullet">Bullets</SelectItem>
            <SelectItem value="ordered">Numbered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Items */}
      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <div key={item.id} className="group/item flex items-center gap-2">
            {block.listType === "checkbox" ? (
              <button
                type="button"
                onClick={() => handleToggleCheck(item.id)}
                aria-label={item.checked ? "Uncheck item" : "Check item"}
                className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer ${
                  item.checked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/60"
                }`}
              >
                {item.checked && <Check className="size-3" />}
              </button>
            ) : block.listType === "ordered" ? (
              <span className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">
                {idx + 1}.
              </span>
            ) : (
              <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/70 ml-1.5" />
            )}

            <input
              ref={(el) => {
                inputRefs.current[item.id] = el;
              }}
              type="text"
              value={item.content}
              onChange={(e) =>
                setItemDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
              }
              onBlur={() => handleItemBlur(item.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddItem(idx);
                }
              }}
              placeholder="List item..."
              className={`flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 ${
                block.listType === "checkbox" && item.checked
                  ? "line-through text-muted-foreground"
                  : "text-foreground"
              }`}
            />

            <button
              type="button"
              onClick={() => handleRemoveItem(item.id)}
              aria-label="Remove item"
              className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add item + optional footer */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => handleAddItem()}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>Add item</span>
        </button>

        <input
          type="text"
          value={footer}
          onChange={(e) => setFooterDraft(e.target.value)}
          onBlur={() => {
            if (footerDraft !== null) {
              emit(items, block.listType, header, footerDraft);
              setFooterDraft(null);
            }
          }}
          placeholder="Footer note..."
          className="w-40 bg-transparent text-right text-[11px] text-muted-foreground outline-none placeholder:text-muted-foreground/40"
        />
      </div>
    </div>
  );
}
