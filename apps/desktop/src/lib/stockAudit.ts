/**
 * Online stock-audit helpers for Settings → Stock Audit (Prod P8).
 * OWNER/MANAGER: POST /audits/start → /:id/lines → /:id/submit.
 * Do not queue while offline. Owner web remains the review surface.
 */

import type {
  StockAuditLinesSubmitInput,
  StockAuditStartInput,
  StockAuditSubmitInput,
} from "@r2a/shared-types";
import { apiRequest, ApiError } from "@/lib/api";
import {
  listReceiveBatches,
  searchReceiveProducts,
  type ReceiveBatchRow,
  type ReceiveProductHit,
} from "@/lib/receiveStock";

export type { ReceiveBatchRow, ReceiveProductHit };

export type StartedStockAudit = {
  id: string;
  auditNo: string;
  storeId: string;
  locationLabel: string;
  status: string;
  notes: string | null;
};

export type StockAuditCountLine = {
  batchId: string;
  productId: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  systemQty: number;
  countedQty: number;
};

export type SubmittedStockAudit = {
  id: string;
  auditNo: string;
  status: string;
  itemsChecked: number;
  varianceAmount: number;
};

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function strOrNull(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v);
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseStarted(raw: unknown): StartedStockAudit {
  const row = asRecord(raw);
  if (!row) throw new ApiError("Invalid audit response", 500, "error");
  const id = str(row.id);
  const auditNo = str(row.auditNo);
  if (!id || !auditNo) throw new ApiError("Invalid audit response", 500, "error");
  return {
    id,
    auditNo,
    storeId: str(row.storeId),
    locationLabel: str(row.locationLabel),
    status: str(row.status) || "IN_PROGRESS",
    notes: strOrNull(row.notes),
  };
}

function parseSubmitted(raw: unknown): SubmittedStockAudit {
  const row = asRecord(raw);
  if (!row) throw new ApiError("Invalid audit response", 500, "error");
  const id = str(row.id);
  const auditNo = str(row.auditNo);
  if (!id || !auditNo) throw new ApiError("Invalid audit response", 500, "error");
  return {
    id,
    auditNo,
    status: str(row.status),
    itemsChecked: num(row.itemsChecked),
    varianceAmount: num(row.varianceAmount),
  };
}

export async function searchAuditProducts(
  q: string,
): Promise<ReceiveProductHit[]> {
  return searchReceiveProducts(q);
}

export async function listAuditBatches(
  productId: string,
): Promise<ReceiveBatchRow[]> {
  return listReceiveBatches(productId);
}

export async function startStockAudit(
  input: StockAuditStartInput,
): Promise<StartedStockAudit> {
  const raw = await apiRequest<unknown>("/api/v1/audits/start", {
    method: "POST",
    body: input,
  });
  return parseStarted(raw);
}

export async function saveStockAuditLines(
  auditId: string,
  input: StockAuditLinesSubmitInput,
): Promise<SubmittedStockAudit> {
  const raw = await apiRequest<unknown>(
    `/api/v1/audits/${encodeURIComponent(auditId)}/lines`,
    { method: "POST", body: input },
  );
  return parseSubmitted(raw);
}

export async function submitStockAudit(
  auditId: string,
  input: StockAuditSubmitInput = {},
): Promise<SubmittedStockAudit> {
  const raw = await apiRequest<unknown>(
    `/api/v1/audits/${encodeURIComponent(auditId)}/submit`,
    { method: "POST", body: input },
  );
  return parseSubmitted(raw);
}

export function stockAuditErrorMessage(
  err: unknown,
  fallback: string,
): string {
  if (err instanceof ApiError) {
    if (err.statusCode === 401) return err.message || fallback;
    if (err.statusCode === 403) return err.message || fallback;
    if (err.statusCode === 409) return err.message || fallback;
    if (err.statusCode === 404) return err.message || fallback;
    if (err.statusCode === 400) return err.message || fallback;
    return err.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
