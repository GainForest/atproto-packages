import { parseUnits } from "viem";
import { z } from "zod";
import { DECIMALS, fromUsdcUnits } from "./usdc";

export const usdcAmountStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,6})?$/, "Amount must be a valid USDC value.");

export function parseUsdcAmount(value: string): bigint {
  return parseUnits(value, DECIMALS);
}

export function formatUsdcAmount(value: bigint): string {
  return fromUsdcUnits(value);
}
