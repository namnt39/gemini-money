import type { NatureFilter } from "./types";

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const;

export const natureCodeMap: Record<Exclude<NatureFilter, "all">, "IN" | "EX" | "TF"> = {
  income: "IN",
  expense: "EX",
  transfer: "TF",
};
