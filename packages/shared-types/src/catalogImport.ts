import { z } from "zod";
import { productUnitInputSchema } from "./product";

/** Prod P14 — catalog CSV/XLSX import caps (documented). */
export const CATALOG_IMPORT_MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MiB
export const CATALOG_IMPORT_MAX_ROWS = 2000;

const boolish = z
  .union([z.boolean(), z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    const s = String(v).trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(s)) return true;
    if (["false", "0", "no", "n"].includes(s)) return false;
    return undefined;
  });

const optStr = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    return s === "" ? undefined : s;
  });

const optInt = z
  .union([z.number(), z.string()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(String(v).trim());
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be a non-negative integer",
      });
      return z.NEVER;
    }
    return n;
  });

const optPositiveInt = z
  .union([z.number(), z.string()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(String(v).trim());
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be a positive integer",
      });
      return z.NEVER;
    }
    return n;
  });

/**
 * One catalog import row after parse (stable key = sku within tenant).
 * Cost/sell prices are intentionally omitted (batch pricing stays on receive).
 */
export const catalogImportRowSchema = z
  .object({
    sku: z.string().min(1),
    name: z.string().min(1),
    genericName: optStr,
    manufacturer: optStr,
    strength: optStr,
    form: optStr,
    barcode: optStr,
    category: optStr,
    description: optStr,
    requiresPrescription: boolish,
    coldChain: boolish,
    reorderLevel: optInt,
    stripFactor: optPositiveInt,
    boxFactor: optPositiveInt,
    pieceLabel: optStr,
    stripLabel: optStr,
    boxLabel: optStr,
  })
  .superRefine((row, ctx) => {
    const units = buildUnitsFromRow(row);
    const parsed = z.array(productUnitInputSchema).min(1).safeParse(units);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: issue.message,
          path: ["units", ...issue.path],
        });
      }
    }
    if (row.stripFactor && row.boxFactor && row.boxFactor % row.stripFactor !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "BOX factorToBase must be divisible by STRIP factorToBase",
        path: ["boxFactor"],
      });
    }
  });

export type CatalogImportRow = z.infer<typeof catalogImportRowSchema>;

export function buildUnitsFromRow(row: {
  stripFactor?: number;
  boxFactor?: number;
  pieceLabel?: string;
  stripLabel?: string;
  boxLabel?: string;
}): Array<{
  unitType: "PIECE" | "STRIP" | "BOX";
  factorToBase: number;
  label?: string;
}> {
  const units: Array<{
    unitType: "PIECE" | "STRIP" | "BOX";
    factorToBase: number;
    label?: string;
  }> = [
    {
      unitType: "PIECE",
      factorToBase: 1,
      ...(row.pieceLabel ? { label: row.pieceLabel } : {}),
    },
  ];
  if (row.stripFactor) {
    units.push({
      unitType: "STRIP",
      factorToBase: row.stripFactor,
      ...(row.stripLabel ? { label: row.stripLabel } : {}),
    });
  }
  if (row.boxFactor) {
    units.push({
      unitType: "BOX",
      factorToBase: row.boxFactor,
      ...(row.boxLabel ? { label: row.boxLabel } : {}),
    });
  }
  return units;
}

/** Upload payload — client reads file → base64; server parses CSV/XLSX. */
export const catalogImportUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentBase64: z.string().min(1),
});
export type CatalogImportUploadInput = z.infer<typeof catalogImportUploadSchema>;

export const catalogImportCommitSchema = z.object({
  rows: z.array(catalogImportRowSchema).min(1).max(CATALOG_IMPORT_MAX_ROWS),
});
export type CatalogImportCommitInput = z.infer<typeof catalogImportCommitSchema>;

export const catalogImportRowActionSchema = z.enum([
  "create",
  "update",
  "error",
]);
export type CatalogImportRowAction = z.infer<typeof catalogImportRowActionSchema>;
