import { describe, expect, test } from "bun:test";
import type { Note } from "@repo/types";
import { filterAndSortNotes } from "../note-filters";

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
