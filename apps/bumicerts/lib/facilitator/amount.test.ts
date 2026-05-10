import { describe, expect, test } from "bun:test";
import {
  normalizeUsdcAmountString,
  parseUsdcAmount,
  usdcAmountStringSchema,
} from "./amount";

describe("USDC amount normalization", () => {
  test("keeps canonical six-decimal-or-less values unchanged", () => {
    expect(normalizeUsdcAmountString("25")).toBe("25");
    expect(normalizeUsdcAmountString("0.3")).toBe("0.3");
    expect(normalizeUsdcAmountString("1.230000")).toBe("1.23");
  });

  test("accepts raw JavaScript float artifacts at USDC precision", () => {
    expect(normalizeUsdcAmountString("0.30000000000000004")).toBe("0.3");
    expect(normalizeUsdcAmountString("19.900000000000002")).toBe("19.9");
    expect(usdcAmountStringSchema.parse("0.30000000000000004")).toBe("0.3");
    expect(parseUsdcAmount("0.30000000000000004")).toBe(BigInt(300000));
  });

  test("rejects values that would change real USDC precision", () => {
    expect(normalizeUsdcAmountString("0.3333339")).toBeNull();
    expect(normalizeUsdcAmountString("1e-7")).toBeNull();
    expect(() => usdcAmountStringSchema.parse("0.3333339")).toThrow(
      "Amount must be a valid USDC value.",
    );
  });
});
