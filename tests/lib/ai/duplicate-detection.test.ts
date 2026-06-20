import { describe, it, expect } from "vitest";
import {
  findDuplicates,
  suggestMergeStrategies,
} from "@/lib/ai/duplicate-detection";
import type { ParsedPerson } from "@/lib/ai/vision-parser";
import { makePerson } from "../../fixtures";

const parsed = (overrides: Partial<ParsedPerson> = {}): ParsedPerson => ({
  name: "Jane Smith",
  title: "Director",
  confidence: 1,
  ...overrides,
});

describe("findDuplicates", () => {
  it("matches an exact name + title and reports reasons", () => {
    const existing = [
      makePerson("p1", { name: "Jane Smith", title: "Director" }),
    ];
    const matches = findDuplicates(parsed(), existing);
    expect(matches).toHaveLength(1);
    expect(matches[0].existingNode.id).toBe("p1");
    expect(matches[0].matchScore).toBeGreaterThan(0.9);
    expect(matches[0].matchReasons).toContain("Exact or near-exact name match");
  });

  it("returns nothing for clearly different people", () => {
    const existing = [
      makePerson("p1", { name: "Robert Johnson", title: "Accountant" }),
    ];
    expect(findDuplicates(parsed(), existing)).toHaveLength(0);
  });

  it("treats a contained name as a near match (middle initial)", () => {
    const existing = [
      makePerson("p1", { name: "Jane A. Smith", title: "Director" }),
    ];
    const matches = findDuplicates(parsed(), existing);
    expect(matches).toHaveLength(1);
    expect(matches[0].matchScore).toBeGreaterThan(0.9);
  });

  it("ignores group nodes and sorts matches by descending score", () => {
    const existing = [
      makePerson("strong", { name: "Jane Smith", title: "Director" }),
      makePerson("weak", { name: "Jane Smithe", title: "Manager" }),
      {
        id: "g1",
        kind: "group" as const,
        name: "Jane Smith",
        createdAt: "",
        updatedAt: "",
        memberIds: [],
      },
    ];
    const matches = findDuplicates(parsed(), existing);
    expect(matches.map((m) => m.existingNode.id)).not.toContain("g1");
    expect(matches[0].matchScore).toBeGreaterThanOrEqual(
      matches[matches.length - 1].matchScore,
    );
    expect(matches[0].existingNode.id).toBe("strong");
  });

  it("normalizes punctuation and casing in names", () => {
    const existing = [
      makePerson("p1", { name: "JANE SMITH!", title: "director" }),
    ];
    const matches = findDuplicates(parsed(), existing);
    expect(matches).toHaveLength(1);
    expect(matches[0].matchScore).toBeGreaterThan(0.9);
  });
});

describe("suggestMergeStrategies", () => {
  it("suggests create-new when there is no existing match", () => {
    const decisions = suggestMergeStrategies([parsed()], []);
    expect(decisions).toEqual([
      { parsedPerson: parsed(), strategy: "create-new" },
    ]);
  });

  it("suggests skip for a high-confidence match with no conflicts", () => {
    const existing = [
      makePerson("p1", { name: "Jane Smith", title: "Director" }),
    ];
    const [decision] = suggestMergeStrategies([parsed()], existing);
    expect(decision.strategy).toBe("skip");
    expect(decision.existingNodeId).toBe("p1");
    expect(decision.conflicts).toEqual([]);
  });

  it("flags a differing location as a medium-confidence review match", () => {
    // A location mismatch zeroes the location component, capping the weighted
    // score at exactly 0.9 — below the high-confidence (>0.9) threshold — so the
    // suggestion is a review-style update rather than an auto skip.
    const existing = [
      makePerson("p1", {
        name: "Jane Smith",
        title: "Director",
        location: "NYC",
      }),
    ];
    const [decision] = suggestMergeStrategies(
      [parsed({ location: "SF" })],
      existing,
    );
    expect(decision.strategy).toBe("update");
    expect(decision.existingNodeId).toBe("p1");
    expect(decision.conflicts).toEqual(["Uncertain match - please review"]);
  });

  it("skips a high-confidence match when locations also agree (no conflicts)", () => {
    const existing = [
      makePerson("p1", {
        name: "Jane Smith",
        title: "Director",
        location: "NYC",
      }),
    ];
    const [decision] = suggestMergeStrategies(
      [parsed({ location: "nyc" })],
      existing,
    );
    expect(decision.strategy).toBe("skip");
    expect(decision.conflicts).toEqual([]);
  });
});
