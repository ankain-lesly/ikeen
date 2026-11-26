import { describe, expect, test } from "bun:test";
import { noteKeys } from "../notes.api";
import { folderKeys } from "../folders.api";
import { authKeys } from "../auth.api";

describe("TanStack Query Key Factories", () => {
  test("noteKeys produce stable hierarchical keys", () => {
    expect(noteKeys.all).toEqual(["notes"]);
    expect(noteKeys.lists()).toEqual(["notes", "list"]);
    expect(noteKeys.list({ folderId: "f-1" })).toEqual([
      "notes",
      "list",
      { folderId: "f-1" },
    ]);
    expect(noteKeys.detail("n-42")).toEqual(["notes", "detail", "n-42"]);
  });

  test("folderKeys produce stable hierarchical keys", () => {
    expect(folderKeys.all).toEqual(["folders"]);
    expect(folderKeys.lists()).toEqual(["folders", "list"]);
    expect(folderKeys.detail("f-7")).toEqual(["folders", "detail", "f-7"]);
  });

  test("authKeys produce stable keys", () => {
    expect(authKeys.all).toEqual(["auth"]);
    expect(authKeys.profile()).toEqual(["auth", "profile"]);
  });
});
