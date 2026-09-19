/**
 * Inventory Report (Prod P5 + P7 CSV). Content region only — chrome is Batch B.
 * Composes live OWNER reads: inventory-summary, inventory list, expiry.
 * No new cloud aggregate endpoint. CSV exports loaded attention + lot rows.
 */
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Download,
  Package,
  PackageX,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale } from "@/i18n";
import { ApiError } from "@/lib/api";
import { csvStamp, downloadCsv } from "@/lib/csvExport";
import {
  formatCount,
  formatExpiryShort,
  formatTaka,
} from "@/lib/format";
import {
  fetchOwnerExpiry,
  type OwnerExpiryPayload,
  type OwnerExpiryRow,
} from "@/lib/ownerExpiry";
import {
  fetchInventorySummary,
  fetchOwnerInventory,
  type OwnerInventoryRow,
  type OwnerInventorySummary,
} from "@/lib/ownerInventory";
import { useOwnerPath } from "@/lib/OwnerPathProvider";
import { useTenantChrome } from "@/lib/TenantContextProvider";

const ATTENTION_PAGE_SIZE = 8;
const EXPIRY_PAGE_SIZE = 10;

type ReportPayload = {
  summary: OwnerInventorySummary;
  lowStock: OwnerInventoryRow[];
  outOfStock: OwnerInventoryRow[];
  expiry: OwnerExpiryPayload;
};

export function InventoryReportPage() {
  const { t } = useLocale();
  const { storeName } = useTenantChrome();
  const [data, setData] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void Promise.all([
      fetchInventorySummary(),
      fetchOwnerInventory({ tab: "low", limit: 100, offset: 0 }),
      fetchOwnerInventory({ tab: "out", limit: 100, offset: 0 }),
      fetchOwnerExpiry(),
    ])
      .then(([summary, low, out, expiry]) => {
        if (cancelled) return;
        setData({
          summary,
          lowStock: low.items,
          outOfStock: out.items,
          expiry,
        });
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setLoading(false);
        setError(
          err instanceof ApiError
            ? err.message
            : t("reports.inventoryReport.error"),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [reload, t]);

  const attentionForExport = useMemo(() => {
    if (!data) return [];
    const merged: Array<OwnerInventoryRow & { kind: "low" | "out" }> = [
      ...data.lowStock.map((row) => ({ ...row, kind: "low" as const })),
      ...data.outOfStock.map((row) => ({ ...row, kind: "out" as const })),
    ];
    const seen = new Set<string>();
    return merged.filter((row) => {
      if (seen.has(row.productId)) return false;
      seen.add(row.productId);
      return true;
    });
  }, [data]);

  const canExport = attentionForExport.length > 0 || Boolean(data?.expiry.rows.length);

  function exportCsv() {
    if (!data) return;
    if (attentionForExport.length > 0) {
      const headers = [
        t("reports.inventoryReport.table.medicine"),
        t("reports.inventoryReport.table.stock"),
        t("reports.inventoryReport.table.expiry"),
        t("reports.inventoryReport.table.status"),
      ];
      const rows = attentionForExport.map((row) => [
        row.name,
        String(row.quantityOnHand),
        row.nearestExpiry ? formatExpiryShort(row.nearestExpiry) : "",
        row.kind === "out"
          ? t("reports.inventoryReport.status.out")
          : t("reports.inventoryReport.status.low"),
      ]);
      downloadCsv(`inventory-report-attention-${csvStamp()}.csv`, [
        headers,
        ...rows,
      ]);
      return;
    }
    if (data.expiry.rows.length === 0) return;
    const headers = [
      t("reports.inventoryReport.table.medicine"),
      t("reports.inventoryReport.table.batch"),
      t("reports.inventoryReport.table.expiry"),
      t("reports.inventoryReport.table.qty"),
      t("reports.inventoryReport.table.cost"),
    ];
    const rows = [...data.expiry.rows]
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
      .map((row) => [
        row.productName,
        row.batchNumber,
        formatExpiryShort(row.expiryDate),
        String(row.quantityOnHand),
        String(row.costValue),
      ]);
    downloadCsv(`inventory-report-lots-${csvStamp()}.csv`, [headers, ...rows]);
  }

  return (
    <div className="w-full px-5 py-4">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            {t("reports.inventoryReport.breadcrumb")}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
            {t("reports.inventoryReport.title")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t("reports.inventoryReport.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground"
            title={t("reports.inventoryReport.branchLocked")}
          >
            <ReceiptText className="size-4 text-muted" strokeWidth={1.75} />
            {storeName || t("reports.inventoryReport.currentStore")}
          </button>
          <button
            type="button"
            disabled={!canExport}
            title={
              canExport
                ? t("reports.inventoryReport.exportHint")
                : t("reports.inventoryReport.exportEmpty")
            }
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-muted"
            onClick={exportCsv}
          >
            <Download className="size-4" strokeWidth={1.75} />
            {t("reports.inventoryReport.export")}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <p className="text-sm text-muted">
          {t("reports.inventoryReport.loading")}
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

      {data ? <InventoryReportBody data={data} /> : null}
    </div>
  );
}

function InventoryReportBody({ data }: { data: ReportPayload }) {
  const { t } = useLocale();
  const { navigate } = useOwnerPath();
  const [attentionPage, setAttentionPage] = useState(0);
  const [expiryPage, setExpiryPage] = useState(0);

  const attentionRows = useMemo(() => {
    const merged: Array<OwnerInventoryRow & { kind: "low" | "out" }> = [
      ...data.lowStock.map((row) => ({ ...row, kind: "low" as const })),
      ...data.outOfStock.map((row) => ({ ...row, kind: "out" as const })),
    ];
    const seen = new Set<string>();
    return merged.filter((row) => {
      if (seen.has(row.productId)) return false;
      seen.add(row.productId);
      return true;
    });
  }, [data.lowStock, data.outOfStock]);

  const expiryRows = useMemo(() => {
    return [...data.expiry.rows].sort((a, b) =>
      a.expiryDate.localeCompare(b.expiryDate),
    );
  }, [data.expiry.rows]);

  const attentionPageCount = Math.max(
    1,
    Math.ceil(attentionRows.length / ATTENTION_PAGE_SIZE),
  );
  const expiryPageCount = Math.max(
    1,
    Math.ceil(expiryRows.length / EXPIRY_PAGE_SIZE),
  );
  const safeAttentionPage = Math.min(attentionPage, attentionPageCount - 1);
  const safeExpiryPage = Math.min(expiryPage, expiryPageCount - 1);
  const visibleAttention = attentionRows.slice(
    safeAttentionPage * ATTENTION_PAGE_SIZE,
    safeAttentionPage * ATTENTION_PAGE_SIZE + ATTENTION_PAGE_SIZE,
  );
  const visibleExpiry = expiryRows.slice(
    safeExpiryPage * EXPIRY_PAGE_SIZE,
    safeExpiryPage * EXPIRY_PAGE_SIZE + EXPIRY_PAGE_SIZE,
  );

  const bucketMax = Math.max(
    1,
    data.expiry.counts["0_30"],
    data.expiry.counts["31_60"],
    data.expiry.counts["61_90"],
    data.expiry.counts.expired,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t("reports.inventoryReport.kpi.products")}
          value={formatCount(data.summary.totals.productCount)}
          hint={t("reports.inventoryReport.kpi.productsHint")}
          icon={<Package className="size-4 text-primary" strokeWidth={1.75} />}
        />
        <KpiCard
          label={t("reports.inventoryReport.kpi.costValue")}
          value={formatTaka(data.summary.totals.costValue)}
          hint={t("reports.inventoryReport.kpi.costValueHint")}
          icon={<Wallet className="size-4 text-indigo-600" strokeWidth={1.75} />}
        />
        <KpiCard
          label={t("reports.inventoryReport.kpi.lowStock")}
          value={formatCount(data.summary.lowStockCount)}
          hint={t("reports.inventoryReport.kpi.lowStockHint")}
          valueClass="text-orange-600"
          icon={
            <AlertTriangle
              className="size-4 text-orange-500"
              strokeWidth={1.75}
            />
          }
        />
        <KpiCard
          label={t("reports.inventoryReport.kpi.outOfStock")}
          value={formatCount(data.summary.outOfStockCount)}
          hint={t("reports.inventoryReport.kpi.outOfStockHint")}
          valueClass="text-destructive"
          icon={
            <PackageX className="size-4 text-destructive" strokeWidth={1.75} />
          }
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-foreground">
                {t("reports.inventoryReport.expiryBuckets.title")}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {t("reports.inventoryReport.expiryBuckets.subtitle")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <BucketTile
                label={t("reports.inventoryReport.bucket.0_30")}
                count={data.expiry.counts["0_30"]}
                max={bucketMax}
                barClass="bg-amber-500"
              />
              <BucketTile
                label={t("reports.inventoryReport.bucket.31_60")}
                count={data.expiry.counts["31_60"]}
                max={bucketMax}
                barClass="bg-orange-500"
              />
              <BucketTile
                label={t("reports.inventoryReport.bucket.61_90")}
                count={data.expiry.counts["61_90"]}
                max={bucketMax}
                barClass="bg-yellow-500"
              />
              <BucketTile
                label={t("reports.inventoryReport.bucket.expired")}
                count={data.expiry.counts.expired}
                max={bucketMax}
                barClass="bg-red-500"
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">
                {t("reports.inventoryReport.attention.title")}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {t("reports.inventoryReport.attention.subtitle")}
              </p>
            </div>
            {visibleAttention.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">
                {t("reports.inventoryReport.attention.empty")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 text-xs font-medium uppercase tracking-wide text-muted">
                      <th className="px-5 py-2.5 font-medium">
                        {t("reports.inventoryReport.table.medicine")}
                      </th>
                      <th className="px-4 py-2.5 font-medium">
                        {t("reports.inventoryReport.table.stock")}
                      </th>
                      <th className="px-4 py-2.5 font-medium">
                        {t("reports.inventoryReport.table.expiry")}
                      </th>
                      <th className="px-4 py-2.5 font-medium">
                        {t("reports.inventoryReport.table.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAttention.map((row) => (
                      <tr
                        key={row.productId}
                        className="cursor-pointer border-b border-border last:border-b-0 hover:bg-canvas"
                        onClick={() =>
                          navigate(
                            `/inventory/${encodeURIComponent(row.productId)}`,
                          )
                        }
                      >
                        <td className="px-5 py-3">
                          <p className="font-medium text-foreground">
                            {row.name}
                          </p>
                          {row.manufacturer ? (
                            <p className="text-xs text-muted">
                              {row.manufacturer}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {formatCount(row.quantityOnHand)}{" "}
                          {t("reports.inventoryReport.pcs")}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {row.nearestExpiry
                            ? formatExpiryShort(row.nearestExpiry)
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill
                            tone={row.kind === "out" ? "out" : "low"}
                            label={
                              row.kind === "out"
                                ? t("reports.inventoryReport.status.out")
                                : t("reports.inventoryReport.status.low")
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <PaginationFooter
              page={safeAttentionPage}
              pageCount={attentionPageCount}
              total={attentionRows.length}
              onPage={setAttentionPage}
            />
          </section>

          <section className="rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">
                {t("reports.inventoryReport.lots.title")}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {t("reports.inventoryReport.lots.subtitle")}
              </p>
            </div>
            {visibleExpiry.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">
                {t("reports.inventoryReport.lots.empty")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 text-xs font-medium uppercase tracking-wide text-muted">
                      <th className="px-5 py-2.5 font-medium">
                        {t("reports.inventoryReport.table.medicine")}
                      </th>
                      <th className="px-4 py-2.5 font-medium">
                        {t("reports.inventoryReport.table.batch")}
                      </th>
                      <th className="px-4 py-2.5 font-medium">
                        {t("reports.inventoryReport.table.expiry")}
                      </th>
                      <th className="px-4 py-2.5 font-medium">
                        {t("reports.inventoryReport.table.qty")}
                      </th>
                      <th className="px-4 py-2.5 font-medium">
                        {t("reports.inventoryReport.table.cost")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleExpiry.map((row) => (
                      <ExpiryLotRow key={row.batchId} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <PaginationFooter
              page={safeExpiryPage}
              pageCount={expiryPageCount}
              total={expiryRows.length}
              onPage={setExpiryPage}
            />
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <SideCard title={t("reports.inventoryReport.side.snapshot")}>
            <dl className="space-y-2.5 text-sm">
              <SideRow
                label={t("reports.inventoryReport.side.onHand")}
                value={formatCount(data.summary.totals.onHandPieces)}
              />
              <SideRow
                label={t("reports.inventoryReport.side.expiring30")}
                value={formatCount(data.summary.expiring30dCount)}
              />
              <SideRow
                label={t("reports.inventoryReport.side.expiring90")}
                value={formatCount(data.summary.expiring90dCount)}
              />
              <SideRow
                label={t("reports.inventoryReport.side.expired")}
                value={formatCount(data.summary.expiredCount)}
              />
            </dl>
          </SideCard>

          <SideCard title={t("reports.inventoryReport.side.actions")}>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-between rounded-lg border border-border bg-canvas px-3 py-2 text-sm font-medium text-foreground hover:bg-surface"
                onClick={() => navigate("/inventory")}
              >
                {t("reports.inventoryReport.side.openInventory")}
                <ArrowRight className="size-3.5" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-between rounded-lg border border-border bg-canvas px-3 py-2 text-sm font-medium text-foreground hover:bg-surface"
                onClick={() => navigate("/inventory/expiry")}
              >
                {t("reports.inventoryReport.side.openExpiry")}
                <ArrowRight className="size-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </SideCard>
        </div>
      </div>
    </div>
  );
}

function ExpiryLotRow({ row }: { row: OwnerExpiryRow }) {
  const { t } = useLocale();
  const { navigate } = useOwnerPath();
  return (
    <tr
      className="cursor-pointer border-b border-border last:border-b-0 hover:bg-canvas"
      onClick={() =>
        navigate(`/inventory/${encodeURIComponent(row.productId)}`)
      }
    >
      <td className="px-5 py-3">
        <p className="font-medium text-foreground">{row.productName}</p>
        {row.genericName ? (
          <p className="text-xs text-muted">{row.genericName}</p>
        ) : null}
      </td>
      <td className="px-4 py-3 font-medium text-foreground">
        {row.batchNumber}
      </td>
      <td className="px-4 py-3 text-foreground">
        {formatExpiryShort(row.expiryDate)}
      </td>
      <td className="px-4 py-3 text-foreground">
        {formatCount(row.quantityOnHand)} {t("reports.inventoryReport.pcs")}
      </td>
      <td className="px-4 py-3 font-medium text-foreground">
        {formatTaka(row.costValue)}
      </td>
    </tr>
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

function BucketTile({
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
        <Clock className="size-3.5 text-muted" strokeWidth={1.75} />
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

function StatusPill({
  tone,
  label,
}: {
  tone: "low" | "out";
  label: string;
}) {
  const cls =
    tone === "out"
      ? "bg-red-100 text-red-700"
      : "bg-orange-100 text-orange-800";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
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
        {t("reports.inventoryReport.pagination.showing")} {formatCount(total)}{" "}
        {t("reports.inventoryReport.pagination.rows")}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 0}
          className="rounded-md border border-border px-2.5 py-1 text-foreground disabled:cursor-not-allowed disabled:text-muted"
          onClick={() => onPage(page - 1)}
        >
          {t("reports.inventoryReport.pagination.prev")}
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
          {t("reports.inventoryReport.pagination.next")}
        </button>
      </div>
    </div>
  );
}
