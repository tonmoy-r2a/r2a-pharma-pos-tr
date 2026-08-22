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
