import { describe, expect, test } from "bun:test";
import { buildTracePropagationTargets } from "./trace-propagation-targets";

describe("buildTracePropagationTargets", () => {
  test("matches full same-origin URLs", () => {
    const [target] = buildTracePropagationTargets("app.example.com/path");

    expect(target?.test("https://app.example.com/api/example")).toBe(true);
    expect(target?.test("/api/example")).toBe(false);
    expect(target?.test("https://other.example.com/api/example")).toBe(false);
  });

  test("deduplicates empty and equivalent origins", () => {
    const targets = buildTracePropagationTargets(
      "",
      undefined,
      "https://app.example.com/first",
      "app.example.com/second",
    );

    expect(targets).toHaveLength(1);
  });
});
