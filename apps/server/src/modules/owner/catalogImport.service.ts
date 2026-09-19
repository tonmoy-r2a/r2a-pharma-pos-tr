/**
 * Prod P14 — OWNER catalog CSV/XLSX import (products + units).
 * Stable key: sku within tenant. No cost/sell columns (receive owns pricing).
 */

import { prisma } from "@r2a/database";
import {
  CATALOG_IMPORT_MAX_FILE_BYTES,
  CATALOG_IMPORT_MAX_ROWS,
  buildUnitsFromRow,
  catalogImportRowSchema,
  type CatalogImportCommitInput,
  type CatalogImportRow,
  type CatalogImportUploadInput,
} from "@r2a/shared-types";
import * as XLSX from "xlsx";
import { AppError } from "../../utils/AppError";
import type { TenantContext } from "../../types/tenant";

export type CatalogImportDryRunRow = {
  rowNumber: number;
  action: "create" | "update" | "error";
  sku: string;
  name: string;
  message: string | null;
  row: CatalogImportRow | null;
};

export type CatalogImportDryRunResult = {
  fileName: string;
  maxFileBytes: number;
  maxRows: number;
  totalRows: number;
  createCount: number;
  updateCount: number;
  errorCount: number;
  rows: CatalogImportDryRunRow[];
};

export type CatalogImportCommitResult = {
  created: number;
  updated: number;
  skus: string[];
};

const HEADER_ALIASES: Record<string, keyof CatalogImportRow | "ignore"> = {
  sku: "sku",
  name: "name",
  productname: "name",
  medicine: "name",
  medicinename: "name",
  genericname: "genericName",
  generic: "genericName",
  manufacturer: "manufacturer",
  brand: "manufacturer",
  strength: "strength",
  form: "form",
  dosageform: "form",
  barcode: "barcode",
  upc: "barcode",
  ean: "barcode",
  category: "category",
  description: "description",
  requiresprescription: "requiresPrescription",
  rx: "requiresPrescription",
  prescription: "requiresPrescription",
  coldchain: "coldChain",
  reorderlevel: "reorderLevel",
  reorder: "reorderLevel",
  stripfactor: "stripFactor",
  piecesperstrip: "stripFactor",
  boxfactor: "boxFactor",
  piecesperbox: "boxFactor",
  piecelabel: "pieceLabel",
  striplabel: "stripLabel",
  boxlabel: "boxLabel",
  piecefactor: "ignore",
};

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function decodeBase64(contentBase64: string): Buffer {
  const cleaned = contentBase64.replace(/^data:[^;]+;base64,/, "").trim();
  try {
    return Buffer.from(cleaned, "base64");
  } catch {
    throw new AppError("Invalid base64 file content", 400);
  }
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    // Skip trailing empty line
    if (row.length === 1 && row[0] === "" && rows.length > 0) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      pushCell();
      continue;
    }
    if (ch === "\r") continue;
    if (ch === "\n") {
      pushCell();
      pushRow();
      continue;
    }
    cell += ch;
  }
  if (cell.length > 0 || row.length > 0) {
    pushCell();
    pushRow();
  }
  return rows;
}

function sheetToMatrix(buf: Buffer, fileName: string): string[][] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    const text = buf.toString("utf8").replace(/^\uFEFF/, "");
    return parseCsv(text);
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const wb = XLSX.read(buf, { type: "buffer", raw: false });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new AppError("Workbook has no sheets", 400);
    const sheet = wb.Sheets[sheetName];
    if (!sheet) throw new AppError("Workbook sheet missing", 400);
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });
    if (json.length === 0) return [];
    const headers = Object.keys(json[0] ?? {});
    return [
      headers,
      ...json.map((obj) => headers.map((h) => String(obj[h] ?? ""))),
    ];
  }
  throw new AppError("Unsupported file type — use .csv or .xlsx", 400);
}

function matrixToObjects(matrix: string[][]): Record<string, string>[] {
  if (matrix.length === 0) return [];
  const headerRow = matrix[0] ?? [];
  const keys = headerRow.map((h) => HEADER_ALIASES[normalizeHeader(h)] ?? null);
  if (!keys.some((k) => k === "sku") || !keys.some((k) => k === "name")) {
    throw new AppError(
      "Import file must include sku and name columns",
      400,
    );
  }
  const out: Record<string, string>[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const cells = matrix[i] ?? [];
    const obj: Record<string, string> = {};
    let any = false;
    for (let c = 0; c < keys.length; c++) {
      const key = keys[c];
      if (!key || key === "ignore") continue;
      const val = (cells[c] ?? "").trim();
      if (val) any = true;
      obj[key] = val;
    }
    if (any) out.push(obj);
  }
  return out;
}

async function classifyRows(
  ctx: TenantContext,
  rawRows: Record<string, string>[],
): Promise<CatalogImportDryRunRow[]> {
  if (rawRows.length > CATALOG_IMPORT_MAX_ROWS) {
    throw new AppError(
      `Too many rows (max ${CATALOG_IMPORT_MAX_ROWS})`,
      400,
    );
  }

  const skus = [
    ...new Set(
      rawRows
        .map((r) => (r.sku ?? "").trim())
        .filter(Boolean),
    ),
  ];
  const existing = skus.length
    ? await prisma.product.findMany({
        where: { tenantId: ctx.tenantId, sku: { in: skus } },
        select: { id: true, sku: true },
      })
    : [];
  const skuToId = new Map(
    existing
      .filter((p): p is { id: string; sku: string } => Boolean(p.sku))
      .map((p) => [p.sku, p.id]),
  );

  const barcodes = [
    ...new Set(
      rawRows
        .map((r) => (r.barcode ?? "").trim())
        .filter(Boolean),
    ),
  ];
  const barcodeOwners = barcodes.length
    ? await prisma.product.findMany({
        where: { tenantId: ctx.tenantId, barcode: { in: barcodes } },
        select: { sku: true, barcode: true },
      })
    : [];
  const barcodeToSku = new Map(
    barcodeOwners
      .filter(
        (p): p is { sku: string; barcode: string } =>
          Boolean(p.barcode) && Boolean(p.sku),
      )
      .map((p) => [p.barcode, p.sku]),
  );

  const seenSku = new Set<string>();
  const seenBarcode = new Set<string>();
  const result: CatalogImportDryRunRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2; // header = 1
    const raw = rawRows[i]!;
    const parsed = catalogImportRowSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((x) => x.message).join("; ");
      result.push({
        rowNumber,
        action: "error",
        sku: (raw.sku ?? "").trim() || "—",
        name: (raw.name ?? "").trim() || "—",
        message: msg || "Invalid row",
        row: null,
      });
      continue;
    }
    const row = parsed.data;
    if (seenSku.has(row.sku)) {
      result.push({
        rowNumber,
        action: "error",
        sku: row.sku,
        name: row.name,
        message: "Duplicate sku in file",
        row: null,
      });
      continue;
    }
    seenSku.add(row.sku);

    if (row.barcode) {
      if (seenBarcode.has(row.barcode)) {
        result.push({
          rowNumber,
          action: "error",
          sku: row.sku,
          name: row.name,
          message: "Duplicate barcode in file",
          row: null,
        });
        continue;
      }
      seenBarcode.add(row.barcode);
      const ownerSku = barcodeToSku.get(row.barcode);
      if (ownerSku && ownerSku !== row.sku) {
        result.push({
          rowNumber,
          action: "error",
          sku: row.sku,
          name: row.name,
          message: `Barcode already used by sku ${ownerSku}`,
          row: null,
        });
        continue;
      }
    }

    const action = skuToId.has(row.sku) ? "update" : "create";
    result.push({
      rowNumber,
      action,
      sku: row.sku,
      name: row.name,
      message: null,
      row,
    });
  }

  return result;
}

export async function dryRunCatalogImport(
  ctx: TenantContext,
  input: CatalogImportUploadInput,
): Promise<CatalogImportDryRunResult> {
  const buf = decodeBase64(input.contentBase64);
  if (buf.byteLength === 0) {
    throw new AppError("Empty file", 400);
  }
  if (buf.byteLength > CATALOG_IMPORT_MAX_FILE_BYTES) {
    throw new AppError(
      `File too large (max ${CATALOG_IMPORT_MAX_FILE_BYTES} bytes)`,
      400,
    );
  }

  const matrix = sheetToMatrix(buf, input.fileName);
  const objects = matrixToObjects(matrix);
  const rows = await classifyRows(ctx, objects);

  return {
    fileName: input.fileName,
    maxFileBytes: CATALOG_IMPORT_MAX_FILE_BYTES,
    maxRows: CATALOG_IMPORT_MAX_ROWS,
    totalRows: rows.length,
    createCount: rows.filter((r) => r.action === "create").length,
    updateCount: rows.filter((r) => r.action === "update").length,
    errorCount: rows.filter((r) => r.action === "error").length,
    rows,
  };
}

export async function commitCatalogImport(
  ctx: TenantContext,
  input: CatalogImportCommitInput,
): Promise<CatalogImportCommitResult> {
  const skus = input.rows.map((r) => r.sku);
  if (new Set(skus).size !== skus.length) {
    throw new AppError("Duplicate sku in commit payload", 400);
  }

  const existing = await prisma.product.findMany({
    where: { tenantId: ctx.tenantId, sku: { in: skus } },
    select: { id: true, sku: true },
  });
  const skuToId = new Map(
    existing
      .filter((p): p is { id: string; sku: string } => Boolean(p.sku))
      .map((p) => [p.sku, p.id]),
  );

  let created = 0;
  let updated = 0;
  const committedSkus: string[] = [];

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of input.rows) {
        const units = buildUnitsFromRow(row);
        const existingId = skuToId.get(row.sku);
        if (existingId) {
          await tx.productUnit.deleteMany({
            where: { productId: existingId, tenantId: ctx.tenantId },
          });
          await tx.productUnit.createMany({
            data: units.map((u) => ({
              tenantId: ctx.tenantId,
              productId: existingId,
              unitType: u.unitType,
              factorToBase: u.factorToBase,
              label: u.label,
            })),
          });
          await tx.product.update({
            where: { id: existingId },
            data: {
              name: row.name,
              genericName: row.genericName ?? null,
              manufacturer: row.manufacturer ?? null,
              strength: row.strength ?? null,
              form: row.form ?? null,
              sku: row.sku,
              barcode: row.barcode ?? null,
              description: row.description ?? null,
              category: row.category ?? null,
              requiresPrescription: row.requiresPrescription ?? false,
              coldChain: row.coldChain ?? false,
              reorderLevel: row.reorderLevel ?? null,
              isActive: true,
            },
          });
          updated += 1;
        } else {
          await tx.product.create({
            data: {
              tenantId: ctx.tenantId,
              name: row.name,
              genericName: row.genericName,
              manufacturer: row.manufacturer,
              strength: row.strength,
              form: row.form,
              sku: row.sku,
              barcode: row.barcode,
              description: row.description,
              category: row.category,
              requiresPrescription: row.requiresPrescription ?? false,
              coldChain: row.coldChain ?? false,
              reorderLevel: row.reorderLevel,
              units: {
                create: units.map((u) => ({
                  tenantId: ctx.tenantId,
                  unitType: u.unitType,
                  factorToBase: u.factorToBase,
                  label: u.label,
                })),
              },
            },
          });
          created += 1;
        }
        committedSkus.push(row.sku);
      }
    });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      throw new AppError("Product sku or barcode already exists in this tenant", 409);
    }
    throw err;
  }

  return { created, updated, skus: committedSkus };
}
