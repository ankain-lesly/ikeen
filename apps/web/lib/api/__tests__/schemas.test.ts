import { describe, expect, test } from "bun:test";
import {
  authResponseSchema,
  createFolderInputSchema,
  folderSchema,
  mediaUploadResponseSchema,
  noteBlockSchema,
  noteDetailSchema,
  upsertBlockInputSchema,
} from "../schemas";

const NOW = "2026-11-26T06:00:00.000Z";

describe("API Zod Schemas", () => {
  test("parses text, list, and media blocks in NoteDetail", () => {
    const parsed = noteDetailSchema.parse({
      id: "note-1",
      title: "Architecture",
      folderId: "folder-1",
      userId: "user-1",
      content: "",
      tags: ["work", "scratchpad"],
      isPinned: true,
      isArchived: false,
      summary: null,
      version: 3,
      createdAt: NOW,
      updatedAt: NOW,
      deletedAt: null,
      blocks: [
        {
          id: "b-1",
          noteId: "note-1",
          type: "text",
          position: 0,
          content: "# Heading",
          createdAt: NOW,
          updatedAt: NOW,
        },
        {
          id: "b-2",
          noteId: "note-1",
          type: "list",
          position: 1,
          listType: "checkbox",
          header: "Checklist",
          content: [{ id: "li-1", content: "Verify schema", checked: true }],
          createdAt: NOW,
          updatedAt: NOW,
        },
        {
          id: "b-3",
          noteId: "note-1",
          type: "media",
          position: 2,
          content: [
            {
              id: "m-1",
              mediaType: "image",
              url: "https://cdn.example.com/a.png",
              name: "a.png",
            },
          ],
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
    });

    expect(parsed.blocks).toHaveLength(3);
    expect(parsed.blocks[1]?.type).toBe("list");
  });

  test("rejects malformed block variant", () => {
    const res = noteBlockSchema.safeParse({
      id: "b-bad",
      noteId: "note-1",
      type: "list",
      position: 0,
      content: "should-be-array",
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(res.success).toBe(false);
  });

  test("allows explicit null header and footer in upsertBlockInputSchema", () => {
    const parsed = upsertBlockInputSchema.parse({
      type: "list",
      listType: "checkbox",
      header: null,
      footer: null,
    });
    expect(parsed.header).toBeNull();
    expect(parsed.footer).toBeNull();
  });

  test("validates Folder and rejects empty folder name on create", () => {
    const folder = folderSchema.parse({
      id: "f-1",
      name: "Projects",
      color: "#39ff14",
      icon: "folder",
      isLocked: false,
      sortOrder: 0,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(folder.name).toBe("Projects");
    expect(createFolderInputSchema.safeParse({ name: "" }).success).toBe(false);
  });

  test("validates AuthResponse", () => {
    const res = authResponseSchema.parse({
      user: {
        id: "u-1",
        email: "dev@ikeen.app",
        username: "devlee",
        firstName: "Dev",
        lastName: "Lee",
        type: "user",
      },
      accessToken: "jwt-token",
    });
    expect(res.user.email).toBe("dev@ikeen.app");
  });

  test("validates MediaUploadResponse", () => {
    const res = mediaUploadResponseSchema.parse({
      ok: true,
      data: {
        id: "m-1",
        url: "https://cdn.ikeen.app/uploads/photo.png",
        filename: "photo.png",
        original_filename: "photo.png",
        mime_type: "image/png",
        size: 102400,
      },
    });
    expect(res.ok).toBe(true);
    expect(res.data.mime_type).toBe("image/png");
  });
});
