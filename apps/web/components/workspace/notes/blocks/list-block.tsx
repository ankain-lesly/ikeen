"use client";

import * as React from "react";
import { nanoid } from "nanoid";
import { Check, Plus, X } from "lucide-react";
import type { ListBlock, ListItem, ListType } from "@repo/types";
import { Input } from "@/components/ui/input";

interface ListBlockEditorProps {
  block: ListBlock;
  onCommit: (patch: {
    listType: ListType;
    header: string | null;
    footer: string | null;
    content: ListItem[];
  }) => void;
}

export function ListBlockEditor({ block, onCommit }: ListBlockEditorProps) {
  const [listType, setListType] = React.useState<ListType>(block.listType);
  const [header, setHeader] = React.useState(block.header ?? "");
  const [footer, setFooter] = React.useState(block.footer ?? "");
  const [items, setItems] = React.useState<ListItem[]>(block.content);

  function emit(
    nextItems: ListItem[],
    nextType: ListType = listType,
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
    setItems(next);
    emit(next);
  }

  function handleItemChange(itemId: string, content: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, content } : item)),
    );
  }

  function handleItemBlur() {
    emit(items);
  }

  function handleAddItem() {
    const next: ListItem[] = [
      ...items,
      { id: nanoid(10), content: "", checked: false },
    ];
    setItems(next);
    emit(next);
  }

  function handleRemoveItem(itemId: string) {
    const next = items.filter((item) => item.id !== itemId);
    setItems(next);
    emit(next);
  }

  function handleTypeChange(nextType: ListType) {
    setListType(nextType);
    emit(items, nextType);
  }

  return (
    <div className="space-y-2.5">
      {/* Header + List Type switcher */}
      <div className="flex items-center justify-between gap-2">
        <Input
          value={header}
          onChange={(e) => setHeader(e.target.value)}
          onBlur={() => emit(items)}
          placeholder="List title (optional)"
          className="h-7 border-0 bg-transparent px-0 text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0"
        />
        <select
          aria-label="List style"
          value={listType}
          onChange={(e) => handleTypeChange(e.target.value as ListType)}
          className="h-7 rounded border border-border bg-background px-2 text-[11px] text-muted-foreground outline-none focus:border-primary"
        >
          <option value="checkbox">Checklist</option>
          <option value="bullet">Bullets</option>
          <option value="ordered">Numbered</option>
        </select>
      </div>

      {/* Items */}
      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <div key={item.id} className="group/item flex items-center gap-2">
            {listType === "checkbox" ? (
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
            ) : listType === "ordered" ? (
              <span className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">
                {idx + 1}.
              </span>
            ) : (
              <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/70 ml-1.5" />
            )}

            <input
              type="text"
              value={item.content}
              onChange={(e) => handleItemChange(item.id, e.target.value)}
              onBlur={handleItemBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
              placeholder="List item..."
              className={`flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 ${
                listType === "checkbox" && item.checked
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
          onClick={handleAddItem}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>Add item</span>
        </button>

        <input
          type="text"
          value={footer}
          onChange={(e) => setFooter(e.target.value)}
          onBlur={() => emit(items)}
          placeholder="Footer note..."
          className="w-40 bg-transparent text-right text-[11px] text-muted-foreground outline-none placeholder:text-muted-foreground/40"
        />
      </div>
    </div>
  );
}
