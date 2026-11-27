import { describe, expect, test } from "bun:test";
import type { Note } from "@repo/types";
import {
  filterAndSortNotes,
  getNoteCoverImage,
  stripMarkdown,
} from "../note-filters";

const makeNote = (overrides: Partial<Note>): Note => ({
  id: "n-1",
  title: "Untitled",
  content: "",
  tags: [],
  isPinned: false,
  isArchived: false,
  createdAt: "2026-11-20T10:00:00.000Z",
  updatedAt: "2026-11-20T10:00:00.000Z",
  ...overrides,
});

describe("filterAndSortNotes", () => {
  const fixtures: Note[] = [
    makeNote({
      id: "n-1",
      title: "Alpha Spec",
      content: "Backend architecture",
      tags: ["engineering"],
      isPinned: false,
      updatedAt: "2026-11-25T10:00:00.000Z",
    }),
    makeNote({
      id: "n-2",
      title: "Beta Checklist",
      content: "Launch tasks",
      tags: ["release", "urgent"],
      isPinned: true,
      updatedAt: "2026-11-22T10:00:00.000Z",
    }),
    makeNote({
      id: "n-3",
      title: "Gamma Ideas",
      content: "Scratchpad thoughts",
      tags: ["personal"],
      isPinned: false,
      updatedAt: "2026-11-26T10:00:00.000Z",
    }),
  ];

  test("keeps pinned notes first by default then sorts by updatedAt desc", () => {
    const res = filterAndSortNotes(fixtures, {
      searchQuery: "",
      sortBy: "updatedAt",
      sortDirection: "desc",
    });
    expect(res.map((n) => n.id)).toEqual(["n-2", "n-3", "n-1"]);
  });

  test("filters by title, content, or #tag case-insensitively", () => {
    expect(
      filterAndSortNotes(fixtures, {
        searchQuery: "architecture",
        sortBy: "updatedAt",
        sortDirection: "desc",
      }).map((n) => n.id),
    ).toEqual(["n-1"]);

    expect(
      filterAndSortNotes(fixtures, {
        searchQuery: "#URGENT",
        sortBy: "updatedAt",
        sortDirection: "desc",
      }).map((n) => n.id),
    ).toEqual(["n-2"]);
  });

  test("sorts alphabetically by title ascending", () => {
    const res = filterAndSortNotes(fixtures, {
      searchQuery: "",
      sortBy: "title",
      sortDirection: "asc",
      pinnedFirst: false,
    });
    expect(res.map((n) => n.id)).toEqual(["n-1", "n-2", "n-3"]);
  });
});

describe("stripMarkdown & getNoteCoverImage", () => {
  test("strips markdown headers, bold, links, and inline code", () => {
    expect(
      stripMarkdown("# Tauri v2 Desktop\n**Fast** `SQLite` [docs](https://a.com)"),
    ).toBe("Tauri v2 Desktop Fast SQLite docs");
  });

  test("prefers server coverImageUrl and falls back to markdown image", () => {
    expect(
      getNoteCoverImage({
        coverImageUrl: "https://cdn.ikeen.app/first.png",
        content: "![alt](https://cdn.ikeen.app/other.png)",
      }),
    ).toBe("https://cdn.ikeen.app/first.png");

    expect(
      getNoteCoverImage({
        coverImageUrl: null,
        content: "Intro ![hero](https://cdn.ikeen.app/md.jpg) end",
      }),
    ).toBe("https://cdn.ikeen.app/md.jpg");
  });
});
