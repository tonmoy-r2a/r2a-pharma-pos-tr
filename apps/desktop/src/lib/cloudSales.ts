/**
 * Prod P13 — desktop Transactions → cloud sales reads.
 *
 * Online: `GET /api/v1/sales` (+ `GET /sales/:id`) store-scoped for cashier JWT.
 * Offline: local `transactionLogStore` only.
 * Reconnect: cloud is historical source of truth; keep local-only rows until ingest flush.
 *
 * Does not invent routes — reuses M6 E list/detail. Owner web Sales unchanged.
 */

import type { CartLine } from "@/features/pos/cartTypes";
import type {
  CardSettlementView,
  CashSettlementView,
  MfsSettlementView,
} from "@/features/pos/SaleCompletedScreen";
import { apiRequest, apiRequestEnvelope } from "@/lib/api";
import type { SaleCustomer } from "@/lib/customerSearch";
import type { LoyaltySettlement } from "@/lib/loyaltyCalc";
import { MFS_PROVIDERS, type MfsProviderId } from "@/lib/mfsPaymentStub";
import type { PackagingUnitType } from "@/lib/qtyPackaging";
import { formatInvoiceLabel } from "@/lib/receiptModel";
import { formatTxnLabel } from "@/lib/saleIngest";
import {
  buildLoggedTransaction,
  type LoggedTransaction,
  type TransactionPaymentMethod,
} from "@/lib/transactionLogStore";

const LIST_LIMIT = 100;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function iso(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value.trim() : d.toISOString();
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return "";
}

function asUnitType(raw: unknown): PackagingUnitType {
  const u = asString(raw).toUpperCase();
  if (u === "STRIP" || u === "BOX" || u === "PIECE") return u;
  return "PIECE";
}

function mfsProviderLabel(providerRaw: string): string {
  const id = providerRaw.trim().toUpperCase() as MfsProviderId;
  const found = MFS_PROVIDERS.find((p) => p.id === id);
  const fallback = providerRaw.trim();
  return found?.label ?? (fallback || "MFS");
}

function parseNotesSettlements(notes: string | null): {
  cash: CashSettlementView | null;
  card: CardSettlementView | null;
  mfs: MfsSettlementView | null;
} {
  const text = notes ?? "";
  let cash: CashSettlementView | null = null;
  let card: CardSettlementView | null = null;
  let mfs: MfsSettlementView | null = null;

  const cashMatch = text.match(
    /cash:recv=([\d.]+);change=([\d.]+)/i,
  );
  if (cashMatch) {
    const cashReceived = asNumber(cashMatch[1]);
    const changeReturned = asNumber(cashMatch[2]);
    cash = {
      amountPaid: Math.max(0, cashReceived - changeReturned),
      cashReceived,
      changeReturned,
    };
  }

  const cardMatch = text.match(/card:status=(\w+)/i);
  if (cardMatch) {
    card = { amountPaid: 0, status: "Approved" };
  }

  const mfsMatch = text.match(
    /mfs:provider=([^;]+);payer=([^;]+)(?:;trx=([^;\s]+))?/i,
  );
  if (mfsMatch) {
    mfs = {
      amountPaid: 0,
      providerLabel: mfsProviderLabel(mfsMatch[1] ?? ""),
      payerMobile: (mfsMatch[2] ?? "").trim(),
      trxId: asStringOrNull(mfsMatch[3]),
    };
  }

  return { cash, card, mfs };
}

function itemToCartLine(raw: unknown, index: number): CartLine | null {
  const o = asRecord(raw);
  if (!o) return null;
  const product = asRecord(o.product) ?? {};
  const batch = asRecord(o.batch) ?? {};
  const productName = asString(product.name);
  const batchNumber = asString(batch.batchNumber);
  if (!productName || !batchNumber) return null;

  const unitQty = Math.max(1, Math.trunc(asNumber(o.unitQty, 1)));
  const quantityBase = Math.max(1, Math.trunc(asNumber(o.quantityBase, unitQty)));
  const factorToBase = Math.max(1, Math.round(quantityBase / unitQty) || 1);
  const unitPrice = asNumber(o.unitPrice);
  const lineTotal = asNumber(o.lineTotal);
  const unitType = asUnitType(o.unitType);
  const fefoOverride = Boolean(o.fefoOverride);
  const authorizedByName = asStringOrNull(o.fefoAuthorizedByName);

  return {
    id: asString(o.id) || `cloud-line-${index}`,
    productId: asString(o.productId) || asString(product.id),
    productName,
    genericName: asStringOrNull(product.genericName),
    manufacturer: asStringOrNull(product.manufacturer),
    strength: asStringOrNull(product.strength),
    form: asStringOrNull(product.form),
    batchId: asString(o.batchId) || asString(batch.id),
    batchNumber,
    expiryDate: iso(batch.expiryDate) || asString(batch.expiryDate),
    batchQtyOnHand: 0,
    unitType,
    unitQty,
    unitPrice,
    lineTotal,
    quantityBase,
    factorToBase,
    maxUnitQty: unitQty,
    sellPerBase: factorToBase > 0 ? unitPrice / factorToBase : unitPrice,
    fefo: !fefoOverride,
    fefoOverride: fefoOverride
      ? {
          authorizedById: "",
          authorizedByName: authorizedByName ?? "—",
          authorizedAt: "",
          fefoBatchId: null,
          fefoBatchNumber: null,
          fefoExpiryDate: null,
        }
      : null,
  };
}

function primaryMethod(
  payments: { method: string; amount: number }[],
  loyaltyUsed: number,
  total: number,
): TransactionPaymentMethod {
  if (total <= 0 && loyaltyUsed > 0) return "LOYALTY";
  const methods = payments.map((p) => p.method.toUpperCase());
  if (methods.includes("MFS")) return "MFS";
  if (methods.includes("CARD")) return "CARD";
  if (methods.includes("CASH")) return "CASH";
  if (loyaltyUsed > 0 && total <= 0) return "LOYALTY";
  return "CASH";
}

/**
 * Map a cloud `GET /sales` / `GET /sales/:id` row into the local log shape
 * used by Transactions list + detail / reprint.
 */
export function cloudSaleToLoggedTransaction(
  raw: unknown,
): LoggedTransaction | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id = asString(o.id);
  const soldAt = iso(o.soldAt);
  if (!id || !soldAt) return null;

  const eventId = asString(o.eventId) || id;
  const receiptNo = asStringOrNull(o.receiptNo);
  const subtotal = asNumber(o.subtotal);
  const discount = asNumber(o.discount);
  const total = asNumber(o.total);
  const loyaltyPrevious = Math.max(0, Math.trunc(asNumber(o.loyaltyPrevious)));
  const loyaltyUsed = Math.max(0, Math.trunc(asNumber(o.loyaltyUsed)));
  const loyaltyEarned = Math.max(0, Math.trunc(asNumber(o.loyaltyEarned)));
  /** Locked redeem rate: 1 pt = ৳1. Prefer snapshot; else discount when used. */
  const loyaltyTaka =
    loyaltyUsed > 0
      ? loyaltyUsed
      : Math.max(0, Math.min(discount, subtotal - total));

  const customerRaw = asRecord(o.customer);
  const cashierRaw = asRecord(o.cashier) ?? {};
  const notes = asStringOrNull(o.notes);
  const { cash, card, mfs } = parseNotesSettlements(notes);

  const payments = Array.isArray(o.payments)
    ? o.payments
        .map((p) => {
          const pr = asRecord(p);
          if (!pr) return null;
          return {
            method: asString(pr.method),
            amount: asNumber(pr.amount),
          };
        })
        .filter((p): p is { method: string; amount: number } => Boolean(p?.method))
    : [];

  const payAmount =
    payments.find((p) => p.method.toUpperCase() !== "LOYALTY")?.amount ??
    total;

  const cashSettlement: CashSettlementView | null = cash
    ? { ...cash, amountPaid: cash.amountPaid || payAmount }
    : null;
  const cardSettlement: CardSettlementView | null = card
    ? { amountPaid: payAmount, status: "Approved" }
    : null;
  const mfsSettlement: MfsSettlementView | null = mfs
    ? { ...mfs, amountPaid: payAmount }
    : null;

  const method = primaryMethod(payments, loyaltyUsed, total);
  const settledCash =
    method === "CASH" && !cashSettlement
      ? {
          amountPaid: payAmount,
          cashReceived: payAmount,
          changeReturned: 0,
        }
      : cashSettlement;
  const settledCard =
    method === "CARD" && !cardSettlement
      ? { amountPaid: payAmount, status: "Approved" as const }
      : method === "CARD"
        ? cardSettlement
        : null;
  const settledMfs =
    method === "MFS" ? mfsSettlement : null;

  const lines = Array.isArray(o.items)
    ? o.items
        .map((item, i) => itemToCartLine(item, i))
        .filter((l): l is CartLine => l != null)
    : [];

  const customer: SaleCustomer | null = customerRaw
    ? {
        customerId: asString(customerRaw.id),
        name: asString(customerRaw.name) || "—",
        phone: asStringOrNull(customerRaw.phone),
        loyaltyPoints: loyaltyPrevious,
      }
    : null;

  const settlement: LoyaltySettlement = {
    previousBalance: loyaltyPrevious,
    earned: loyaltyEarned,
    used: loyaltyUsed,
    currentBalance: Math.max(0, loyaltyPrevious - loyaltyUsed + loyaltyEarned),
    fullyCoveredByLoyalty: method === "LOYALTY" || (total <= 0 && loyaltyUsed > 0),
  };

  const completedAtDate = new Date(soldAt);
  const txnLabel =
    (receiptNo && receiptNo.startsWith("TXN-") ? receiptNo : null) ||
    formatTxnLabel(id, eventId);
  const invoiceLabel =
    (receiptNo && receiptNo.startsWith("INV-") ? receiptNo : null) ||
    formatInvoiceLabel(id, eventId, completedAtDate);

  return buildLoggedTransaction({
    saleId: id,
    eventId,
    txnLabel,
    invoiceLabel,
    completedAt: soldAt,
    cashierName: asString(cashierRaw.name) || "—",
    customer,
    lines,
    cartSubtotal: subtotal,
    loyaltyTaka,
    settlement,
    cashSettlement: method === "CASH" ? settledCash : null,
    cardSettlement: method === "CARD" ? settledCard : null,
    mfsSettlement: method === "MFS" ? settledMfs : null,
  });
}

export type CloudSalesListResult = {
  items: LoggedTransaction[];
  total: number;
  limit: number;
  offset: number;
};

/** Store-scoped paged sales (cashier JWT). Prefer recent window = first page. */
export async function listCloudSales(args?: {
  limit?: number;
  offset?: number;
}): Promise<CloudSalesListResult> {
  const limit = Math.min(100, Math.max(1, args?.limit ?? LIST_LIMIT));
  const offset = Math.max(0, args?.offset ?? 0);
  const q = new URLSearchParams();
  q.set("limit", String(limit));
  q.set("offset", String(offset));

  const { data, meta } = await apiRequestEnvelope<unknown>(
    `/api/v1/sales?${q.toString()}`,
  );
  const m =
    meta && typeof meta === "object"
      ? (meta as { total?: number; limit?: number; offset?: number })
      : {};
  const rows = Array.isArray(data) ? data : [];
  const items = rows
    .map(cloudSaleToLoggedTransaction)
    .filter((e): e is LoggedTransaction => e != null);
  return {
    items,
    total: typeof m.total === "number" ? m.total : items.length,
    limit: typeof m.limit === "number" ? m.limit : limit,
    offset: typeof m.offset === "number" ? m.offset : offset,
  };
}

export async function getCloudSale(
  saleId: string,
): Promise<LoggedTransaction | null> {
  const id = saleId.trim();
  if (!id) return null;
  const data = await apiRequest<unknown>(
    `/api/v1/sales/${encodeURIComponent(id)}`,
  );
  return cloudSaleToLoggedTransaction(data);
}

/**
 * Cloud wins for matching saleId/eventId. Append local-only rows
 * (not yet flushed via ingest) sorted by completedAt desc.
 */
export function mergeCloudWithLocal(
  cloud: LoggedTransaction[],
  local: LoggedTransaction[],
): LoggedTransaction[] {
  const cloudKeys = new Set<string>();
  for (const row of cloud) {
    if (row.saleId) cloudKeys.add(row.saleId);
    if (row.eventId) cloudKeys.add(row.eventId);
  }

  const localOnly = local.filter(
    (row) =>
      !cloudKeys.has(row.saleId) &&
      !cloudKeys.has(row.eventId) &&
      !cloudKeys.has(row.txnLabel),
  );

  return [...cloud, ...localOnly]
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    )
    .slice(0, LIST_LIMIT);
}
