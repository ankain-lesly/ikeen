import * as Crypto from "expo-crypto";
import type { ListItem } from "@/lib/types/notes";

const CHECKBOX_RE = /^\s*[-*•]?\s*\[([ xX])\]\s*(.*)$/;
const LIST_MARKER_RE = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/;

export function parsePastedListLine(
  line: string,
  isCheckboxList: boolean,
): { content: string; checked?: boolean } {
  const cb = line.match(CHECKBOX_RE);
  if (cb) {
    return {
      content: cb[2].trim(),
      ...(isCheckboxList ? { checked: cb[1].toLowerCase() === "x" } : {}),
    };
  }
  const marker = line.match(LIST_MARKER_RE);
  return { content: (marker ? marker[1] : line).trim() };
}

export type ItemTextUpdateResult = {
  type: "stage" | "immediate";
  nextItems: ListItem[];
  focusItemId?: string;
};

export function applyItemTextOrSplit(
  items: ListItem[],
  itemId: string,
  rawText: string,
  isCheckboxList: boolean,
): ItemTextUpdateResult {
  if (!rawText.includes("\n")) {
    return {
      type: "stage",
      nextItems: items.map((item) =>
        item.id === itemId ? { ...item, content: rawText } : item,
      ),
    };
  }

  const idx = items.findIndex((item) => item.id === itemId);
  if (idx === -1) return { type: "stage", nextItems: items };

  const target = items[idx];
  const rawLines = rawText.split(/\r?\n/);
  const hasMarkers = rawLines.some(
    (l) => CHECKBOX_RE.test(l) || LIST_MARKER_RE.test(l),
  );

  const parsedLines: Array<{ content: string; checked?: boolean }> =
    rawLines.length === 2 && !hasMarkers
      ? [{ content: rawLines[0] }, { content: rawLines[1] }]
      : rawLines
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => parsePastedListLine(l, isCheckboxList));

  const [first, ...rest] =
    parsedLines.length > 0
      ? parsedLines
      : [{ content: "" }, { content: "" }];

  const updatedCurrent: ListItem = {
    ...target,
    content: first.content,
    ...(first.checked !== undefined ? { checked: first.checked } : {}),
  };

  const inserted: ListItem[] = rest.map((p) => ({
    id: Crypto.randomUUID(),
    content: p.content,
    checked: p.checked ?? false,
  }));

  return {
    type: "immediate",
    nextItems: [
      ...items.slice(0, idx),
      updatedCurrent,
      ...inserted,
      ...items.slice(idx + 1),
    ],
    focusItemId: inserted.at(-1)?.id ?? updatedCurrent.id,
  };
}

export function removeEmptyItemOnBackspace(
  items: ListItem[],
  group: ListItem[],
  itemId: string,
): { nextItems: ListItem[]; focusItemId?: string } | null {
  if (items.length <= 1) return null;
  const groupIdx = group.findIndex((i) => i.id === itemId);
  if (groupIdx === -1 || group[groupIdx].content.length > 0) return null;

  return {
    nextItems: items.filter((i) => i.id !== itemId),
    focusItemId: group[groupIdx - 1]?.id ?? group[groupIdx + 1]?.id,
  };
}

export function reorderListGroup(
  items: ListItem[],
  group: ListItem[],
  fromIndex: number,
  toIndex: number,
): ListItem[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= group.length ||
    toIndex >= group.length
  ) {
    return items;
  }

  const reordered = [...group];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);

  const groupIds = new Set(group.map((i) => i.id));
  let cursor = 0;
  return items.map((item) =>
    groupIds.has(item.id) ? reordered[cursor++] : item,
  );
}
