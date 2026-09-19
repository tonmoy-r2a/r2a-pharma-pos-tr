import { apiRequest, apiRequestEnvelope } from "./api";

export type StockAuditStatus = "IN_PROGRESS" | "UNDER_REVIEW" | "COMPLETED" | "VARIANCE_FOUND";
export type StockAuditActivityType = "CREATED" | "COUNT_STARTED" | "VARIANCE_DETECTED" | "REVIEWED" | "FEFO_CORRECTED" | "COMPLETED";

export type AuditUser = {
  id: string;
  name: string;
  role?: string;
};

export type AuditStore = {
  id: string;
  name: string;
  code: string;
};

export type AuditSummary = {
  id: string;
  auditNo: string;
  status: StockAuditStatus;
  locationLabel: string;
  itemsChecked: number;
  varianceAmount: number;
  startedAt: string;
  completedAt?: string | null;
  reviewedAt?: string | null;
  store?: AuditStore;
  createdBy?: AuditUser;
  reviewedBy?: AuditUser | null;
};

export type AuditActivity = {
  id: string;
  auditId?: string | null;
  actorUserId?: string | null;
  type: StockAuditActivityType;
  note?: string | null;
  createdAt: string;
  actor?: AuditUser | null;
};

export type AuditDashboardPayload = {
  kpis: {
    totalAudits: number;
    inProgress: number;
    underReview: number;
    varianceFound: number;
    completed: number;
    itemsChecked: number;
    varianceAmount: number;
    openFefoViolations: number;
    correctedFefoViolations: number;
  };
  recentAudits: AuditSummary[];
  activity: AuditActivity[];
};

export type AuditListQuery = {
  q?: string;
  limit?: number;
  offset?: number;
};

export type AuditListResult = {
  items: AuditSummary[];
  total: number;
  limit: number;
  offset: number;
};

export type StockAuditLineStatus = "MATCHES" | "DISCREPANCY";
export type FefoViolationStatus = "OPEN" | "CORRECTED" | "DISMISSED";

export type AuditDetailLine = {
  id: string;
  tenantId: string;
  auditId: string;
  batchId: string;
  productId: string;
  systemQty: number;
  countedQty: number;
  differenceQty: number;
  status: StockAuditLineStatus;
  productNameSnapshot: string;
  batchNumberSnapshot: string;
  expiryDateSnapshot: string;
  costPerBaseSnapshot: number;
  createdAt: string;
  updatedAt: string;
};

export type FefoViolationDetail = {
  id: string;
  tenantId: string;
  storeId: string;
  saleId?: string | null;
  saleItemId?: string | null;
  auditId?: string | null;
  productId: string;
  skippedBatchId: string;
  pickedBatchId: string;
  observedIssue: string;
  recommendedAction: string;
  status: FefoViolationStatus;
  correctionNote?: string | null;
  correctedAt?: string | null;
  correctedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    genericName?: string | null;
    sku: string;
  };
  skippedBatch?: {
    id: string;
    batchNumber: string;
    expiryDate: string;
  };
  pickedBatch?: {
    id: string;
    batchNumber: string;
    expiryDate: string;
  };
  correctedBy?: AuditUser | null;
};

export type AuditDetail = {
  id: string;
  tenantId: string;
  storeId: string;
  auditNo: string;
  status: StockAuditStatus;
  locationLabel: string;
  itemsChecked: number;
  varianceAmount: number;
  notes?: string | null;
  startedAt: string;
  completedAt?: string | null;
  reviewedAt?: string | null;
  createdByUserId: string;
  reviewedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  store?: AuditStore;
  createdBy?: AuditUser;
  reviewedBy?: AuditUser | null;
  lines: AuditDetailLine[];
  activity: AuditActivity[];
  fefoViolations: FefoViolationDetail[];
};

export type StockAuditReviewPayload = {
  decision: "COMPLETE" | "KEEP_VARIANCE";
  notes?: string;
};

export type FefoViolationCorrectPayload = {
  correctionNote: string;
};

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export async function fetchAuditDashboard(): Promise<AuditDashboardPayload> {
  return apiRequest<AuditDashboardPayload>("/api/v1/owner/audit/dashboard");
}

export async function fetchAudits(query: AuditListQuery = {}): Promise<AuditListResult> {
  const { data, meta } = await apiRequestEnvelope<AuditSummary[]>(
    `/api/v1/owner/audits${qs(query)}`,
  );
  const m = (meta ?? {}) as Partial<Omit<AuditListResult, "items">>;
  return {
    items: data,
    total: m.total ?? data.length,
    limit: m.limit ?? query.limit ?? data.length,
    offset: m.offset ?? query.offset ?? 0,
  };
}

export async function fetchAuditDetail(auditId: string): Promise<AuditDetail> {
  return apiRequest<AuditDetail>(`/api/v1/owner/audits/${encodeURIComponent(auditId)}`);
}

export async function reviewAudit(
  auditId: string,
  input: StockAuditReviewPayload,
): Promise<AuditDetail> {
  return apiRequest<AuditDetail>(
    `/api/v1/owner/audits/${encodeURIComponent(auditId)}/review`,
    {
      method: "POST",
      body: input,
    },
  );
}

export async function correctFefoViolation(
  violationId: string,
  input: FefoViolationCorrectPayload,
): Promise<FefoViolationDetail> {
  return apiRequest<FefoViolationDetail>(
    `/api/v1/owner/fefo-violations/${encodeURIComponent(violationId)}/correct`,
    {
      method: "POST",
      body: input,
    },
  );
}
