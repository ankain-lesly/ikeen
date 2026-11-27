import { describe, expect, it } from "bun:test";
import {
  computeExpiryIso,
  createShareInputSchema,
  forkShareResponseSchema,
  noteShareSchema,
  publicSharedNoteSchema,
  shareKeys,
  unlockShareResponseSchema,
  updateShareInputSchema,
} from "../shares.api";

describe("shares.api schemas & helpers", () => {
  const iso = "2026-11-26T10:00:00.000Z";

  it("validates NoteShare payloads", () => {
    const parsed = noteShareSchema.parse({
      id: "share-1",
      noteId: "note-1",
      slug: "AbCdEf123456",
      url: "https://ikeen.app/s/AbCdEf123456",
      isActive: true,
      access: "copy",
      hasPassword: true,
      expiresAt: null,
      viewCount: 12,
      createdAt: iso,
      updatedAt: iso,
    });

    expect(parsed.slug).toBe("AbCdEf123456");
    expect(parsed.access).toBe("copy");
    expect(parsed.hasPassword).toBe(true);
  });

  it("validates PublicSharedNote with text, list, and media blocks", () => {
    const parsed = publicSharedNoteSchema.parse({
      slug: "AbCdEf123456",
      title: "Architecture Notes",
      content: "Intro paragraph",
      tags: ["design", "v2"],
      updatedAt: iso,
      author: { firstName: "Lee", username: "devlee" },
      access: "copy",
      canFork: true,
      blocks: [
        {
          id: "b1",
          noteId: "AbCdEf123456",
          type: "text",
          position: 0,
          content: "Hello shared world",
          createdAt: iso,
          updatedAt: iso,
          deletedAt: null,
        },
        {
          id: "b2",
          noteId: "AbCdEf123456",
          type: "list",
          listType: "checkbox",
          position: 1,
          header: "Checklist",
          content: [{ id: "i1", content: "Ship Phase 2", checked: true }],
          createdAt: iso,
          updatedAt: iso,
          deletedAt: null,
        },
        {
          id: "b3",
          noteId: "AbCdEf123456",
          type: "media",
          position: 2,
          content: [
            {
              id: "m1",
              mediaType: "image",
              localUri: "",
              url: "https://cdn.ikeen.app/diagram.png",
              caption: "System diagram",
            },
          ],
          createdAt: iso,
          updatedAt: iso,
          deletedAt: null,
        },
      ],
    });

    expect(parsed.blocks).toHaveLength(3);
    expect(parsed.canFork).toBe(true);
  });

  it("validates unlock, fork, and input schemas", () => {
    expect(
      unlockShareResponseSchema.parse({ token: "jwt.token", expiresIn: 3600 })
        .expiresIn,
    ).toBe(3600);
    expect(
      forkShareResponseSchema.parse({ noteId: "n-2", title: "Copy" }).noteId,
    ).toBe("n-2");
    expect(
      createShareInputSchema.parse({ access: "view", password: null }).password,
    ).toBeNull();
    expect(
      updateShareInputSchema.parse({ rotateSlug: true, isActive: true })
        .rotateSlug,
    ).toBe(true);
    expect(() =>
      createShareInputSchema.parse({ password: "123" }),
    ).toThrow();
  });

  it("produces deterministic query keys and expiry timestamps", () => {
    expect(shareKeys.all).toEqual(["shares"]);
    expect(shareKeys.detail("note-99")).toEqual(["shares", "note", "note-99"]);

    const base = Date.parse("2026-11-26T00:00:00.000Z");
    expect(computeExpiryIso("never", base)).toBeNull();
    expect(computeExpiryIso("24h", base)).toBe("2026-11-27T00:00:00.000Z");
    expect(computeExpiryIso("7d", base)).toBe("2026-12-03T00:00:00.000Z");
  });
});
