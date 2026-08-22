import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  FileWarning,
  Filter,
  Hourglass,
  ListChecks,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, type MessageKey } from "@/i18n";
import { ApiError } from "@/lib/api";
import {
  fetchAuditDashboard,
  fetchAudits,
  type AuditActivity,
  type AuditDashboardPayload,
  type AuditSummary,
  type StockAuditStatus,
} from "@/lib/audit";
import { daysUntilExpiry, fetchOwnerExpiry, type OwnerExpiryRow } from "@/lib/ownerExpiry";
import { formatCount, formatDateTime, formatTaka, formatUtcDate } from "@/lib/format";
import { useOwnerPath } from "@/lib/OwnerPathProvider";

type AuditDashboardData = {
  dashboard: AuditDashboardPayload;
  audits: AuditSummary[];
  expiryRows: OwnerExpiryRow[];
};

const AUDIT_LIMIT = 5;
const EXPIRY_LIMIT = 3;

const STATUS_KEYS: Record<StockAuditStatus, MessageKey> = {
  IN_PROGRESS: "audit.status.inProgress",
  UNDER_REVIEW: "audit.status.underReview",
  COMPLETED: "audit.status.completed",
  VARIANCE_FOUND: "audit.status.varianceFound",
};

export function AuditDashboardPage() {
  const { t } = useLocale();
  const [data, setData] = useState<AuditDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void Promise.all([
      fetchAuditDashboard(),
      fetchAudits({ limit: AUDIT_LIMIT, offset: 0 }),
      fetchOwnerExpiry(),
    ])
      .then(([dashboard, auditList, expiry]) => {
        if (cancelled) return;
        setData({ dashboard, audits: auditList.items, expiryRows: expiry.rows });
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setLoading(false);
        setError(err instanceof ApiError ? err.message : t("audit.error"));
      });
    return () => {
      cancelled = true;
    };
  }, [reload, t]);

  const visibleAudits = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const rows = data?.audits ?? [];
    if (!q) return rows;
    return rows.filter((audit) =>
      audit.auditNo.toLocaleLowerCase().includes(q) ||
      audit.locationLabel.toLocaleLowerCase().includes(q) ||
      (audit.createdBy?.name.toLocaleLowerCase().includes(q) ?? false),
    );
  }, [data, query]);

  return (
    <div className="w-full px-5 py-4">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            {t("audit.breadcrumb")}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
            {t("audit.title")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("audit.subtitle")}</p>
        </div>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title={t("audit.generateHint")}
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground opacity-70"
        >
          <FileWarning className="size-4" strokeWidth={1.75} />
          {t("audit.generateReport")}
        </button>
      </div>

      {loading && !data ? <p className="text-sm text-muted">{t("audit.loading")}</p> : null}

      {error && !data ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          <p className="text-destructive">{error}</p>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1 text-foreground hover:bg-canvas"
            onClick={() => setReload((n) => n + 1)}
          >
            {t("audit.retry")}
          </button>
        </div>
      ) : null}

      {data ? (
        <AuditDashboardBody
          data={data}
          visibleAudits={visibleAudits}
          query={query}
          onQueryChange={setQuery}
        />
      ) : null}
    </div>
  );
}

function AuditDashboardBody({
  data,
  visibleAudits,
  query,
  onQueryChange,
}: {
  data: AuditDashboardData;
  visibleAudits: AuditSummary[];
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const { t } = useLocale();
  const upcomingExpiryRows = data.expiryRows.filter((row) => {
    const days = daysUntilExpiry(row.expiryDate);
    return days != null && days >= 0;
  });
  const expiryRows = [...upcomingExpiryRows]
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
    .slice(0, EXPIRY_LIMIT);
  const complianceTotal = data.dashboard.kpis.openFefoViolations + data.dashboard.kpis.correctedFefoViolations;
  const complianceRate = complianceTotal > 0
    ? (data.dashboard.kpis.correctedFefoViolations / complianceTotal) * 100
    : 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<ListChecks className="size-4 text-primary" strokeWidth={1.75} />} label={t("audit.kpi.totalAudits")} value={formatCount(data.dashboard.kpis.totalAudits)} hint={t("audit.kpi.monthly")} tone="border-border" />
        <KpiCard icon={<Hourglass className="size-4 text-amber-600" strokeWidth={1.75} />} label={t("audit.kpi.pendingReviews")} value={formatCount(data.dashboard.kpis.underReview + data.dashboard.kpis.varianceFound)} hint={t("audit.kpi.highPriority")} tone="border-amber-200 bg-amber-50/50" />
        <KpiCard icon={<ClipboardCheck className="size-4 text-blue-600" strokeWidth={1.75} />} label={t("audit.kpi.expiringSoon")} value={formatCount(upcomingExpiryRows.length)} hint={t("audit.kpi.next90")} tone="border-border" />
        <KpiCard icon={<ShieldAlert className="size-4 text-destructive" strokeWidth={1.75} />} label={t("audit.kpi.fefoViolations")} value={formatCount(data.dashboard.kpis.openFefoViolations)} hint={t("audit.kpi.highPriority")} tone="border-red-200 bg-red-50/50" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-xl border border-border bg-surface">
          <SectionHeader icon={<Hourglass className="size-4 text-primary" strokeWidth={1.75} />} title={t("audit.expiry.title")} action={t("audit.viewAll")} />
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("audit.expiry.medicine")}</th>
                  <th className="px-4 py-3 font-semibold">{t("audit.expiry.batch")}</th>
                  <th className="px-4 py-3 font-semibold">{t("audit.expiry.expiry")}</th>
                  <th className="px-4 py-3 font-semibold">{t("audit.expiry.stock")}</th>
                  <th className="px-4 py-3 font-semibold">{t("audit.expiry.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expiryRows.map((row) => <ExpiryRow key={row.batchId} row={row} />)}
                {expiryRows.length === 0 ? <EmptyRow colSpan={5} text={t("audit.expiry.empty")} /> : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <ShieldCheck className="size-4 text-primary" strokeWidth={1.75} />
            {t("audit.fefo.title")}
          </h2>
          <p className="mt-4 text-xs font-medium text-muted">{t("audit.fefo.rate")}</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-3xl font-semibold text-primary">{complianceRate.toFixed(1)}%</p>
            <div className="grid size-12 place-items-center rounded-2xl border-4 border-primary text-primary">
              <ShieldCheck className="size-5" strokeWidth={1.75} />
            </div>
          </div>
          <p className="mt-4 text-xs font-semibold text-destructive">{t("audit.fefo.requiresAttention")}</p>
          <div className="mt-3 space-y-2">
            <FefoAttentionCard label={t("audit.fefo.openViolations")} value={data.dashboard.kpis.openFefoViolations} />
            <FefoAttentionCard label={t("audit.fefo.correctedViolations")} value={data.dashboard.kpis.correctedFefoViolations} />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-xl border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ClipboardCheck className="size-4 text-primary" strokeWidth={1.75} />
              {t("audit.recent.title")}
            </h2>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-muted">
                <Search className="size-4" strokeWidth={1.75} />
                <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={t("audit.recent.search")} className="w-40 bg-transparent outline-none placeholder:text-muted" />
              </label>
              <button type="button" disabled aria-disabled="true" className="grid size-9 cursor-not-allowed place-items-center rounded-lg border border-border text-muted" title={t("audit.recent.filterHint")}>
                <Filter className="size-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("audit.recent.auditId")}</th>
                  <th className="px-4 py-3 font-semibold">{t("audit.recent.date")}</th>
                  <th className="px-4 py-3 font-semibold">{t("audit.recent.staff")}</th>
                  <th className="px-4 py-3 font-semibold">{t("audit.recent.location")}</th>
                  <th className="px-4 py-3 font-semibold">{t("audit.recent.items")}</th>
                  <th className="px-4 py-3 font-semibold">{t("audit.recent.variance")}</th>
                  <th className="px-4 py-3 font-semibold">{t("audit.recent.status")}</th>
                  <th className="px-4 py-3 font-semibold">{t("audit.recent.action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleAudits.map((audit) => <AuditRow key={audit.id} audit={audit} />)}
                {visibleAudits.length === 0 ? <EmptyRow colSpan={8} text={t("audit.recent.empty")} /> : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <AlertTriangle className="size-4 text-primary" strokeWidth={1.75} />
            {t("audit.activity.title")}
          </h2>
          <div className="mt-4 space-y-3">
            {data.dashboard.activity.map((event) => <ActivityItem key={event.id} event={event} />)}
            {data.dashboard.activity.length === 0 ? <p className="text-sm text-muted">{t("audit.activity.empty")}</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, hint, tone }: { icon: ReactNode; label: string; value: string; hint: string; tone: string }) {
  return (
    <section className={`rounded-xl border bg-surface p-4 shadow-sm ${tone}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-primary/10">{icon}</span>
        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-foreground">{hint}</span>
      </div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
    </section>
  );
}

function SectionHeader({ icon, title, action }: { icon: ReactNode; title: string; action: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">{icon}{title}</h2>
      <span className="text-xs font-semibold text-primary">{action}</span>
    </div>
  );
}

function ExpiryRow({ row }: { row: OwnerExpiryRow }) {
  const { t } = useLocale();
  const days = daysUntilExpiry(row.expiryDate);
  const critical = days != null && days <= 30;
  return (
    <tr className="align-top">
      <td className="px-4 py-3 font-medium text-foreground">
        {row.productName}
        {row.genericName ? <p className="text-xs font-normal text-muted">{row.genericName}</p> : null}
      </td>
      <td className="px-4 py-3 text-foreground">{row.batchNumber}</td>
      <td className="px-4 py-3 text-foreground">{formatUtcDate(row.expiryDate)}</td>
      <td className="px-4 py-3 text-foreground">{formatCount(row.quantityOnHand)} {t("audit.pcs")}</td>
      <td className="px-4 py-3">
        <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${critical ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
          {critical ? t("audit.expiry.critical") : t("audit.expiry.warning")}
        </span>
        {days != null ? <span className="ml-2 text-xs text-muted">{formatCount(Math.max(days, 0))} {t("audit.days")}</span> : null}
      </td>
    </tr>
  );
}

function AuditRow({ audit }: { audit: AuditSummary }) {
  const { t } = useLocale();
  const { navigate } = useOwnerPath();
  return (
    <tr className="align-top">
      <td className="px-4 py-3 font-semibold text-primary">{audit.auditNo}</td>
      <td className="px-4 py-3 text-foreground">{formatUtcDate(audit.startedAt)}</td>
      <td className="px-4 py-3 text-foreground">{audit.createdBy?.name ?? t("audit.system")}</td>
      <td className="px-4 py-3 text-foreground">{audit.locationLabel}</td>
      <td className="px-4 py-3 text-foreground">{formatCount(audit.itemsChecked)} {t("audit.items")}</td>
      <td className={`px-4 py-3 font-medium ${audit.varianceAmount < 0 ? "text-destructive" : audit.varianceAmount > 0 ? "text-blue-700" : "text-foreground"}`}>{formatTaka(audit.varianceAmount)}</td>
      <td className="px-4 py-3"><StatusBadge status={audit.status} /></td>
      <td className="px-4 py-3">
        <button type="button" className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-canvas" onClick={() => navigate(`/audit/${audit.id}`)}>
          {t("audit.view")} <ArrowRight className="size-3" strokeWidth={1.75} />
        </button>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: StockAuditStatus }) {
  const { t } = useLocale();
  const tone = status === "COMPLETED"
    ? "bg-teal-100 text-teal-700"
    : status === "VARIANCE_FOUND"
      ? "bg-red-100 text-red-700"
      : status === "UNDER_REVIEW"
        ? "bg-indigo-100 text-indigo-700"
        : "bg-amber-100 text-amber-700";
  return <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{t(STATUS_KEYS[status])}</span>;
}

function FefoAttentionCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-canvas px-3 py-3 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <span className="inline-flex items-center gap-1 font-semibold text-primary">{formatCount(value)} <ArrowRight className="size-3" strokeWidth={1.75} /></span>
    </div>
  );
}

function ActivityItem({ event }: { event: AuditActivity }) {
  const { t } = useLocale();
  return (
    <div className="relative border-l-2 border-border pl-4">
      <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-primary" />
      <p className="text-[11px] font-medium text-muted">{formatDateTime(event.createdAt)}</p>
      <div className="mt-1 rounded-lg bg-canvas px-3 py-2 text-sm text-foreground">
        <p>{event.note || t("audit.activity.fallback")}</p>
        {event.actor?.name ? <p className="mt-1 text-xs text-muted">{event.actor.name}</p> : null}
      </div>
    </div>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-muted">{text}</td>
    </tr>
  );
}
