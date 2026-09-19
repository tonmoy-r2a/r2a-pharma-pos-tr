/**
 * Prod P14 — Owner catalog CSV/XLSX import client.
 * Dry-run then commit upserts by sku. OWNER-only routes.
 */

import {
  CATALOG_IMPORT_MAX_FILE_BYTES,
  CATALOG_IMPORT_MAX_ROWS,
  type CatalogImportRow,
} from "@r2a/shared-types";
import { apiRequest, ApiError } from "./api";

export { CATALOG_IMPORT_MAX_FILE_BYTES, CATALOG_IMPORT_MAX_ROWS };

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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export async function dryRunCatalogImport(
  file: File,
): Promise<CatalogImportDryRunResult> {
  if (file.size > CATALOG_IMPORT_MAX_FILE_BYTES) {
    throw new ApiError(
      `File too large (max ${CATALOG_IMPORT_MAX_FILE_BYTES} bytes)`,
      400,
    );
  }
  const contentBase64 = await fileToBase64(file);
  return apiRequest<CatalogImportDryRunResult>(
    "/api/v1/owner/catalog/import/dry-run",
    {
      method: "POST",
      body: { fileName: file.name, contentBase64 },
    },
  );
}

export async function commitCatalogImport(
  rows: CatalogImportRow[],
): Promise<CatalogImportCommitResult> {
  return apiRequest<CatalogImportCommitResult>(
    "/api/v1/owner/catalog/import/commit",
    {
      method: "POST",
      body: { rows },
    },
  );
}
