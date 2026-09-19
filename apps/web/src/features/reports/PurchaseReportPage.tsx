/**
 * Purchase Report (Prod P6 + P7 CSV). Content region only — chrome is Batch B.
 * Composes live OWNER `GET /owner/purchase-orders` (list + KPIs).
 * No new cloud aggregate endpoint. CSV exports loaded PO rows.
 * Route lock: `/reports/purchasing`.
 */
import {
  ArrowRight,
  ClipboardList,
  Download,
  FileText,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale } from "@/i18n";
import { ApiError } from "@/lib/api";
import { csvStamp, downloadCsv } from "@/lib/csvExport";
import {
  formatCount,
  formatSalesDateTime,
  formatTaka,
  formatUtcDate,
} from "@/lib/format";
import { useOwnerPath } from "@/lib/OwnerPathProvider";
import {
  fetchPurchaseOrders,
  type PurchaseOrderListRow,
  type PurchaseOrderStatus,
  type PurchaseOrdersResult,
} from "@/lib/purchaseOrders";
import { useTenantChrome } from "@/lib/TenantContextProvider";

const OPEN_PAGE_SIZE = 8;
const RECENT_PAGE_SIZE = 10;

const OPEN_STATUSES = new Set<PurchaseOrderStatus>([
  "SENT",
  "PARTIALLY_RECEIVED",
]);

export function PurchaseReportPage() {
  const { t } = useLocale();
  const { storeName } = useTenantChrome();
  const [data, setData] = useState<PurchaseOrdersResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchPurchaseOrders({ limit: 100, offset: 0 })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setLoading(false);
        setError(
          err instanceof ApiError
            ? err.message
            : t("reports.purchaseReport.error"),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [reload, t]);

  const canExport = Boolean(data && data.items.length > 0);

  function statusLabel(status: PurchaseOrderStatus): string {
    if (status === "DRAFT") return t("purchasing.status.draft");
    if (status === "SENT") return t("purchasing.status.sent");
    if (status === "PARTIALLY_RECEIVED") return t("purchasing.status.partial");
    return t("purchasing.status.received");
  }

  function exportCsv() {
    if (!data || data.items.length === 0) return;
    const headers = [
      t("reports.purchaseReport.table.po"),
      t("reports.purchaseReport.table.supplier"),
      t("reports.purchaseReport.table.created"),
      t("reports.purchaseReport.table.expected"),
      t("reports.purchaseReport.table.total"),
      t("reports.purchaseReport.table.status"),
    ];
    const rows = data.items.map((row) => [
      row.poNumber,
      row.supplier?.name ?? "",
      formatSalesDateTime(row.createdAt),
      row.expectedDelivery ? formatUtcDate(row.expectedDelivery) : "",
      String(row.estimatedTotal),
      statusLabel(row.status),
    ]);
    downloadCsv(`purchase-report-${csvStamp()}.csv`, [headers, ...rows]);
  }

  return (
    <div className="w-full px-5 py-4">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            {t("reports.purchaseReport.breadcrumb")}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
            {t("reports.purchaseReport.title")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t("reports.purchaseReport.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground"
            title={t("reports.purchaseReport.branchLocked")}
          >
            <ReceiptText className="size-4 text-muted" strokeWidth={1.75} />
            {storeName || t("reports.purchaseReport.currentStore")}
          </button>
          <button
            type="button"
            disabled={!canExport}
            title={
              canExport
                ? t("reports.purchaseReport.exportHint")
                : t("reports.purchaseReport.exportEmpty")
            }
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-muted"
            onClick={exportCsv}
          >
            <Download className="size-4" strokeWidth={1.75} />
            {t("reports.purchaseReport.export")}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <p className="text-sm text-muted">
          {t("reports.purchaseReport.loading")}
        </p>
      ) : null}

      {error && !data ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          <p className="text-destructive">{error}</p>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1 text-foreground hover:bg-canvas"
            onClick={() => setReload((n) => n + 1)}
          >
            {t("reports.retry")}
          </button>
        </div>
      ) : null}

      {data ? <PurchaseReportBody data={data} /> : null}
    </div>
  );
}

function PurchaseReportBody({ data }: { data: PurchaseOrdersResult }) {
  const { t } = useLocale();
  const { navigate } = useOwnerPath();
  const [openPage, setOpenPage] = useState(0);
  const [recentPage, setRecentPage] = useState(0);

  const by = data.kpis.byStatus;
  const openCount = by.SENT + by.PARTIALLY_RECEIVED;
  const openOrders = useMemo(
    () => data.items.filter((row) => OPEN_STATUSES.has(row.status)),
    [data.items],
  );
  const recentOrders = data.items;

  const openPageCount = Math.max(
    1,
    Math.ceil(openOrders.length / OPEN_PAGE_SIZE),
  );
  const recentPageCount = Math.max(
    1,
    Math.ceil(recentOrders.length / RECENT_PAGE_SIZE),
  );
  const safeOpenPage = Math.min(openPage, openPageCount - 1);
  const safeRecentPage = Math.min(recentPage, recentPageCount - 1);
  const visibleOpen = openOrders.slice(
    safeOpenPage * OPEN_PAGE_SIZE,
    safeOpenPage * OPEN_PAGE_SIZE + OPEN_PAGE_SIZE,
  );
  const visibleRecent = recentOrders.slice(
    safeRecentPage * RECENT_PAGE_SIZE,
    safeRecentPage * RECENT_PAGE_SIZE + RECENT_PAGE_SIZE,
  );

  const statusMax = Math.max(
    1,
    by.DRAFT,
    by.SENT,
    by.PARTIALLY_RECEIVED,
    by.RECEIVED,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t("reports.purchaseReport.kpi.total")}
          value={formatCount(data.kpis.total)}
          hint={t("reports.purchaseReport.kpi.totalHint")}
          icon={
            <ShoppingBag className="size-4 text-primary" strokeWidth={1.75} />
          }
        />
        <KpiCard
          label={t("reports.purchaseReport.kpi.open")}
          value={formatCount(openCount)}
          hint={t("reports.purchaseReport.kpi.openHint")}
          valueClass="text-primary"
          icon={
            <ClipboardList className="size-4 text-primary" strokeWidth={1.75} />
          }
        />
        <KpiCard
          label={t("reports.purchaseReport.kpi.received")}
          value={formatCount(by.RECEIVED)}
          hint={t("reports.purchaseReport.kpi.receivedHint")}
          valueClass="text-emerald-600"
          icon={
            <PackageCheck
              className="size-4 text-emerald-600"
              strokeWidth={1.75}
            />
          }
        />
        <KpiCard
          label={t("reports.purchaseReport.kpi.openValue")}
          value={formatTaka(data.kpis.openValue)}
          hint={t("reports.purchaseReport.kpi.openValueHint")}
          icon={<Wallet className="size-4 text-blue-600" strokeWidth={1.75} />}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-foreground">
                {t("reports.purchaseReport.status.title")}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {t("reports.purchaseReport.status.subtitle")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatusTile
                label={t("purchasing.status.draft")}
                count={by.DRAFT}
                max={statusMax}
                barClass="bg-slate-400"
              />
              <StatusTile
                label={t("purchasing.status.sent")}
                count={by.SENT}
                max={statusMax}
                barClass="bg-sky-500"
              />
              <StatusTile
                label={t("purchasing.status.partial")}
                count={by.PARTIALLY_RECEIVED}
                max={statusMax}
                barClass="bg-amber-500"
              />
              <StatusTile
                label={t("purchasing.status.received")}
                count={by.RECEIVED}
                max={statusMax}
                barClass="bg-emerald-500"
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">
                {t("reports.purchaseReport.open.title")}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {t("reports.purchaseReport.open.subtitle")}
              </p>
            </div>
            {visibleOpen.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">
                {t("reports.purchaseReport.open.empty")}
              </p>
            ) : (
              <PoTable rows={visibleOpen} />
            )}
            <PaginationFooter
              page={safeOpenPage}
              pageCount={openPageCount}
              total={openOrders.length}
              onPage={setOpenPage}
            />
          </section>

          <section className="rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">
                {t("reports.purchaseReport.recent.title")}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {t("reports.purchaseReport.recent.subtitle")}
              </p>
            </div>
            {visibleRecent.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">
                {t("reports.purchaseReport.recent.empty")}
              </p>
            ) : (
              <PoTable rows={visibleRecent} />
            )}
            <PaginationFooter
              page={safeRecentPage}
              pageCount={recentPageCount}
              total={recentOrders.length}
              onPage={setRecentPage}
            />
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <SideCard title={t("reports.purchaseReport.side.snapshot")}>
            <dl className="space-y-2.5 text-sm">
              <SideRow
                label={t("reports.purchaseReport.side.drafts")}
                value={formatCount(by.DRAFT)}
              />
              <SideRow
                label={t("reports.purchaseReport.side.sent")}
                value={formatCount(by.SENT)}
              />
              <SideRow
                label={t("reports.purchaseReport.side.partial")}
                value={formatCount(by.PARTIALLY_RECEIVED)}
              />
              <SideRow
                label={t("reports.purchaseReport.side.received")}
                value={formatCount(by.RECEIVED)}
              />
            </dl>
          </SideCard>

          <SideCard title={t("reports.purchaseReport.side.actions")}>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-between rounded-lg border border-border bg-canvas px-3 py-2 text-sm font-medium text-foreground hover:bg-surface"
                onClick={() => navigate("/purchasing")}
              >
                {t("reports.purchaseReport.side.openPurchasing")}
                <ArrowRight className="size-3.5" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-between rounded-lg border border-border bg-canvas px-3 py-2 text-sm font-medium text-foreground hover:bg-surface"
                onClick={() => navigate("/purchasing/new")}
              >
                {t("reports.purchaseReport.side.createPo")}
                <ArrowRight className="size-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </SideCard>
        </div>
      </div>
    </div>
  );
}

function PoTable({ rows }: { rows: PurchaseOrderListRow[] }) {
  const { t } = useLocale();
  const { navigate } = useOwnerPath();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-slate-50 text-xs font-medium uppercase tracking-wide text-muted">
            <th className="px-5 py-2.5 font-medium">
              {t("reports.purchaseReport.table.po")}
            </th>
            <th className="px-4 py-2.5 font-medium">
              {t("reports.purchaseReport.table.supplier")}
            </th>
            <th className="px-4 py-2.5 font-medium">
              {t("reports.purchaseReport.table.created")}
            </th>
            <th className="px-4 py-2.5 font-medium">
              {t("reports.purchaseReport.table.expected")}
            </th>
            <th className="px-4 py-2.5 font-medium">
              {t("reports.purchaseReport.table.total")}
            </th>
            <th className="px-4 py-2.5 font-medium">
              {t("reports.purchaseReport.table.status")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer border-b border-border last:border-b-0 hover:bg-canvas"
              onClick={() =>
                navigate(`/purchasing/${encodeURIComponent(row.id)}`)
              }
            >
              <td className="px-5 py-3">
                <p className="font-semibold text-primary">{row.poNumber}</p>
                {row.reference ? (
                  <p className="text-xs text-muted">{row.reference}</p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-foreground">
                {row.supplier?.name ?? "—"}
              </td>
              <td className="px-4 py-3 text-foreground">
                {formatSalesDateTime(row.createdAt)}
              </td>
              <td className="px-4 py-3 text-foreground">
                {row.expectedDelivery
                  ? formatUtcDate(row.expectedDelivery)
                  : "—"}
              </td>
              <td className="px-4 py-3 font-medium text-foreground">
                {formatTaka(row.estimatedTotal)}
              </td>
              <td className="px-4 py-3">
                <PoStatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PoStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const { t } = useLocale();
  const cls =
    status === "DRAFT"
      ? "bg-slate-100 text-slate-700"
      : status === "SENT"
        ? "bg-sky-100 text-sky-800"
        : status === "PARTIALLY_RECEIVED"
          ? "bg-amber-100 text-amber-800"
          : "bg-emerald-100 text-emerald-800";
  const label =
    status === "DRAFT"
      ? "purchasing.status.draft"
      : status === "SENT"
        ? "purchasing.status.sent"
        : status === "PARTIALLY_RECEIVED"
          ? "purchasing.status.partial"
          : "purchasing.status.received";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {t(label)}
    </span>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  valueClass?: string;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        <span className="text-muted">{icon}</span>
      </div>
      <p
        className={`mt-2 text-2xl font-semibold tracking-tight ${valueClass ?? "text-foreground"}`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </article>
  );
}

function StatusTile({
  label,
  count,
  max,
  barClass,
}: {
  label: string;
  count: number;
  max: number;
  barClass: string;
}) {
  const width = `${Math.max(6, Math.round((count / max) * 100))}%`;
  return (
    <div className="rounded-lg border border-border bg-canvas px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted">{label}</p>
        <FileText className="size-3.5 text-muted" strokeWidth={1.75} />
      </div>
      <p className="mt-2 text-xl font-semibold text-foreground">
        {formatCount(count)}
      </p>
      <div className="mt-2 h-1.5 rounded-full bg-slate-200">
        <div className={`h-1.5 rounded-full ${barClass}`} style={{ width }} />
      </div>
    </div>
  );
}

function SideCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function SideRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function PaginationFooter({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const { t } = useLocale();
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-sm text-muted">
      <p>
        {t("reports.purchaseReport.pagination.showing")} {formatCount(total)}{" "}
        {t("reports.purchaseReport.pagination.rows")}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 0}
          className="rounded-md border border-border px-2.5 py-1 text-foreground disabled:cursor-not-allowed disabled:text-muted"
          onClick={() => onPage(page - 1)}
        >
          {t("reports.purchaseReport.pagination.prev")}
        </button>
        <span className="px-2 text-foreground">
          {page + 1} / {pageCount}
        </span>
        <button
          type="button"
          disabled={page >= pageCount - 1}
          className="rounded-md border border-border px-2.5 py-1 text-foreground disabled:cursor-not-allowed disabled:text-muted"
          onClick={() => onPage(page + 1)}
        >
          {t("reports.purchaseReport.pagination.next")}
        </button>
      </div>
    </div>
  );
}
