import { apiRequestEnvelope } from "./api";

export type ShiftStatus = "OPEN" | "CLOSED" | "FLAGGED";

export type ShiftVarianceDecision = "ACCEPTED_DIFFERENCE" | "COUNT_CORRECTED" | "OTHER";

/** Prod P10 — Owner cash-count request on Shift. */
export type CashCountRequestStatus = "NONE" | "REQUESTED" | "CANCELLED" | "COMPLETED";

export type ShiftUser = {
  id: string;
  name: string;
};

export type ShiftListRow = {
  id: string;
  tenantId: string;
  storeId: string;
  userId: string;
  shiftNo: string;
  status: ShiftStatus;
  openingFloat: number | string;
  openedAt: string;
  closedAt: string | null;
  countedCash: number | string | null;
  expectedCash: number | string | null;
  variance: number | string | null;
  cashSales: number | string;
  cardSales: number | string;
  mfsSales: number | string;
  txnCount: number;
  cashCountStatus?: CashCountRequestStatus | null;
  cashCountRequestedAt?: string | null;
  cashCountRequestedByUserId?: string | null;
  cashCountNote?: string | null;
  cashCountCancelledAt?: string | null;
  cashCountCompletedAt?: string | null;
  user?: ShiftUser | null;
};

export type ShiftActivityRow = {
  id: string;
  type:
    | "OPENED"
    | "SALE_RECORDED"
    | "CLOSE_SUBMITTED"
    | "VARIANCE_REVIEWED"
    | "CLOSED"
    | "CASH_COUNT_REQUESTED"
    | "CASH_COUNT_CANCELLED";
  note: string | null;
  createdAt: string;
};

export type ShiftPaymentBreakdown = {
  method: "CASH" | "CARD" | "MFS";
  amount: number | string;
};

export type ShiftDetail = ShiftListRow & {
  createdAt: string;
  updatedAt: string;
  activity: ShiftActivityRow[];
  breakdown: ShiftPaymentBreakdown[];
  varianceDecision?: string | null;
  varianceNote?: string | null;
  adjustmentReference?: string | null;
  reviewedAt?: string | null;
  reviewedByUserId?: string | null;
};

export type ShiftListQuery = {
  q?: string;
  status?: ShiftStatus;
  userId?: string;
  limit?: number;
  offset?: number;
};

export type ShiftResolveInput = {
  varianceDecision: ShiftVarianceDecision;
  varianceNote?: string;
  adjustmentReference?: string;
};

export type ShiftListResult = {
  items: ShiftListRow[];
  total: number;
  limit: number;
  offset: number;
};

export type ShiftKpis = {
  all: number;
  open: number;
  closed: number;
  flagged: number;
};

export async function fetchShifts(
  query: ShiftListQuery = {},
): Promise<ShiftListResult> {
  const params = buildShiftParams(query);
  const { data, meta } = await apiRequestEnvelope<any>(
    `/api/v1/owner/shifts?${params.toString()}`,
  );
  const dataRecord = data && typeof data === "object" ? data : {};
  const items = Array.isArray((dataRecord as any).items)
    ? ((dataRecord as any).items as ShiftListRow[])
    : [];
  const metaRecord = meta && typeof meta === "object" ? meta : {};
  return {
    items,
    total: typeof (metaRecord as any).total === "number" ? (metaRecord as any).total : items.length,
    limit: typeof (metaRecord as any).limit === "number" ? (metaRecord as any).limit : (query.limit ?? 25),
    offset: typeof (metaRecord as any).offset === "number" ? (metaRecord as any).offset : (query.offset ?? 0),
  };
}

/** Use the list endpoint meta totals so Shift Management KPIs stay live without new API fields. */
export async function fetchShiftKpis(query: Pick<ShiftListQuery, "q" | "userId"> = {}): Promise<ShiftKpis> {
  const [all, open, closed, flagged] = await Promise.all([
    fetchShifts({ ...query, limit: 1, offset: 0 }),
    fetchShifts({ ...query, status: "OPEN", limit: 1, offset: 0 }),
    fetchShifts({ ...query, status: "CLOSED", limit: 1, offset: 0 }),
    fetchShifts({ ...query, status: "FLAGGED", limit: 1, offset: 0 }),
  ]);
  return {
    all: all.total,
    open: open.total,
    closed: closed.total,
    flagged: flagged.total,
  };
}

export async function fetchShiftDetail(shiftId: string): Promise<ShiftDetail> {
  const { data } = await apiRequestEnvelope<ShiftDetail>(
    `/api/v1/owner/shifts/${encodeURIComponent(shiftId)}`,
  );
  return data;
}

export async function resolveShiftVariance(
  shiftId: string,
  input: ShiftResolveInput,
): Promise<ShiftDetail> {
  const { data } = await apiRequestEnvelope<ShiftDetail>(
    `/api/v1/owner/shifts/${encodeURIComponent(shiftId)}/resolve`,
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

export type ShiftCashCountRequestInput = {
  note?: string;
};

/** Prod P10 — Owner requests cash count on an OPEN shift. */
export async function requestCashCount(
  shiftId: string,
  input: ShiftCashCountRequestInput = {},
): Promise<ShiftListRow> {
  const { data } = await apiRequestEnvelope<ShiftListRow>(
    `/api/v1/owner/shifts/${encodeURIComponent(shiftId)}/cash-count-request`,
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

/** Prod P10 — Owner cancels a pending cash-count request. */
export async function cancelCashCountRequest(shiftId: string): Promise<ShiftListRow> {
  const { data } = await apiRequestEnvelope<ShiftListRow>(
    `/api/v1/owner/shifts/${encodeURIComponent(shiftId)}/cash-count-request/cancel`,
    {
      method: "POST",
      body: {},
    },
  );
  return data;
}

function buildShiftParams(query: ShiftListQuery): URLSearchParams {
  const params = new URLSearchParams();
  params.set("limit", String(query.limit ?? 25));
  params.set("offset", String(query.offset ?? 0));
  const q = query.q?.trim();
  if (q) params.set("q", q);
  if (query.status) params.set("status", query.status);
  if (query.userId) params.set("userId", query.userId);
  return params;
}

export function moneyNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
