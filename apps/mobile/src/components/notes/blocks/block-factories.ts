import * as Crypto from "expo-crypto";
import type { CreateBlockInput, MediaItem, NoteBlock } from "@/lib/types/notes";

export function createDefaultTextBlockInput(): CreateBlockInput {
  return {
    type: "text",
    content: "",
  };
}

export function createDefaultChecklistBlockInput(): CreateBlockInput {
  return {
    type: "list",
    listType: "checkbox",
    content: [{ id: Crypto.randomUUID(), content: "", checked: false }],
  };
}

export function createDefaultMediaBlockInput(
  items: MediaItem[] = [],
): CreateBlockInput {
  return {
    type: "media",
    content: items,
  };
}

export function cloneBlockInput(
  block: NoteBlock,
  position: number,
): CreateBlockInput {
  if (block.type === "list") {
    return {
      type: "list",
      position,
      listType: block.listType,
      header: block.header,
      footer: block.footer,
      content: block.content.map((item) => ({
        ...item,
        id: Crypto.randomUUID(),
      })),
    };
  }

  if (block.type === "media") {
    return {
      type: "media",
      position,
      content: block.content.map((item) => ({
        ...item,
        id: Crypto.randomUUID(),
      })),
    };
  }

  return {
    type: "text",
    position,
    content: block.content,
  };
}
