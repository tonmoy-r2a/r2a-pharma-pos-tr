/**
 * Product Movement report (Enhance D2).
 * High demand / low sell / no-sales bands from live SaleItem aggregation.
 * Payments remain CASH | CARD | MFS only — no credit tender columns.
 */
import {
  CalendarDays,
  Download,
  PackageSearch,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useLocale, type MessageKey } from "@/i18n";
import { ApiError } from "@/lib/api";
import { csvStamp, downloadCsv } from "@/lib/csvExport";
import { formatCount, formatTaka } from "@/lib/format";
import { useOwnerPath } from "@/lib/OwnerPathProvider";
import {
  fetchProductMovement,
  isProductMovementPreset,
  readProductMovementBandFromUrl,
  readProductMovementPresetFromUrl,
  syncProductMovementUrl,
  type ProductMovementBand,
  type ProductMovementPayload,
  type ProductMovementRangePreset,
} from "@/lib/ownerProductMovement";
import { useTenantChrome } from "@/lib/TenantContextProvider";

const PAGE_SIZE = 50;
const PRESETS: ProductMovementRangePreset[] = ["last30", "last90", "last180"];
const BANDS: ProductMovementBand[] = [
  "all",
  "high_demand",
  "steady",
  "low_sell",
  "no_sales",
];

const TILE_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

export function ProductMovementPage() {
  const { t } = useLocale();
  const { storeId, storeName } = useTenantChrome();
  const { navigate } = useOwnerPath();
  const [preset, setPreset] = useState<ProductMovementRangePreset>(() =>
    readProductMovementPresetFromUrl(),
  );
  const [band, setBand] = useState<ProductMovementBand>(() =>
    readProductMovementBandFromUrl(),
  );
  const [qInput, setQInput] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q") ?? "";
  });
  const [q, setQ] = useState(qInput);
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<ProductMovementPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    syncProductMovementUrl({ preset, band, q });
  }, [preset, band, q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchProductMovement({
      preset,
      band,
      q: q || undefined,
      storeId: storeId ?? undefined,
      limit: PAGE_SIZE,
      offset,
    })
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setLoading(false);
        setError(
          err instanceof ApiError
            ? err.message
            : t("reports.productMovement.error"),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [preset, band, q, offset, reload, storeId, t]);

  const canExport = Boolean(data && data.items.length > 0);
  const totalRows = data?.meta.totalRows ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const pageIndex = Math.floor(offset / PAGE_SIZE);
  const safePage = Math.min(pageIndex, pageCount - 1);

  function exportCsv() {
    if (!data || data.items.length === 0) return;
    const headers = [
      t("reports.productMovement.table.product"),
      t("reports.productMovement.table.sku"),
      t("reports.productMovement.table.band"),
      t("reports.productMovement.table.units"),
      t("reports.productMovement.table.revenue"),
      t("reports.productMovement.table.txns"),
      t("reports.productMovement.table.onHand"),
      t("reports.productMovement.table.daysCover"),
      t("reports.productMovement.table.stockStatus"),
    ];
    const rows = data.items.map((row) => [
      row.name,
      row.sku,
      t(bandLabelKey(row.band)),
      String(row.unitsSold),
      String(row.revenue),
      String(row.txnCount),
      String(row.onHand),
      row.daysOfCover == null ? "" : String(row.daysOfCover),
      t(stockLabelKey(row.stockStatus)),
    ]);
    downloadCsv(`product-movement-${csvStamp()}.csv`, [headers, ...rows]);
  }

  function applySearch() {
    setOffset(0);
    setQ(qInput.trim());
  }

  return (
    <div className="w-full px-5 py-4">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            {t("reports.productMovement.breadcrumb")}
          </p>
          <h1 className="mt-0.5 text-3xl font-semibold tracking-tight text-foreground">
            {t("reports.productMovement.title")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t("reports.productMovement.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground">
            <PackageSearch className="size-4 text-muted" strokeWidth={1.75} />
            {storeName || t("reports.productMovement.currentStore")}
          </span>
          <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground">
            <CalendarDays className="size-4 text-muted" strokeWidth={1.75} />
            <select
              className="bg-transparent text-sm font-medium outline-none"
              value={preset}
              aria-label={t("reports.productMovement.rangeLabel")}
              onChange={(event) => {
                const next = event.target.value;
                if (!isProductMovementPreset(next)) return;
                setPreset(next);
                setOffset(0);
              }}
            >
              {PRESETS.map((option) => (
                <option key={option} value={option}>
                  {t(rangePresetKey(option))}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!canExport}
            title={
              canExport
                ? t("reports.productMovement.exportHint")
                : t("reports.productMovement.exportEmpty")
            }
            className={`inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-muted ${TILE_FOCUS}`}
            onClick={exportCsv}
          >
            <Download className="size-4" strokeWidth={1.75} />
            {t("reports.productMovement.export")}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {BANDS.map((option) => {
          const active = band === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${TILE_FOCUS} ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-foreground hover:bg-canvas"
              }`}
              onClick={() => {
                setBand(option);
                setOffset(0);
              }}
            >
              {t(bandFilterKey(option))}
              {data && option !== "all" ? (
                <span className="ml-1.5 tabular-nums text-muted">
                  {formatCount(bandCount(data, option))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <form
        className="mb-5 flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          applySearch();
        }}
      >
        <label className="relative min-w-[16rem] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            strokeWidth={1.75}
          />
          <input
            type="search"
            value={qInput}
            onChange={(event) => setQInput(event.target.value)}
            placeholder={t("reports.productMovement.searchPlaceholder")}
            aria-label={t("reports.productMovement.searchPlaceholder")}
            className={`w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground outline-none ${TILE_FOCUS}`}
          />
        </label>
        <button
          type="submit"
          className={`rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-canvas ${TILE_FOCUS}`}
        >
          {t("reports.productMovement.search")}
        </button>
      </form>

      {loading && !data ? (
        <p className="text-sm text-muted">{t("reports.productMovement.loading")}</p>
      ) : null}

      {error && !data ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          <p className="text-destructive">{error}</p>
          <button
            type="button"
            className={`rounded-md border border-border px-3 py-1 text-foreground hover:bg-canvas ${TILE_FOCUS}`}
            onClick={() => setReload((n) => n + 1)}
          >
            {t("reports.retry")}
          </button>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiTile
              label={t("reports.productMovement.kpi.highDemand")}
              value={formatCount(data.kpis.highDemandCount)}
              icon={<TrendingUp className="size-4 text-primary" strokeWidth={1.75} />}
            />
            <KpiTile
              label={t("reports.productMovement.kpi.steady")}
              value={formatCount(data.kpis.steadyCount)}
              icon={null}
            />
            <KpiTile
              label={t("reports.productMovement.kpi.lowSell")}
              value={formatCount(data.kpis.lowSellCount)}
              icon={<TrendingDown className="size-4 text-amber-600" strokeWidth={1.75} />}
            />
            <KpiTile
              label={t("reports.productMovement.kpi.noSales")}
              value={formatCount(data.kpis.noSalesCount)}
              icon={null}
            />
            <KpiTile
              label={t("reports.productMovement.kpi.units")}
              value={formatCount(data.kpis.totalUnitsSold)}
              icon={null}
            />
            <KpiTile
              label={t("reports.productMovement.kpi.revenue")}
              value={formatTaka(data.kpis.totalRevenue)}
              icon={null}
            />
          </div>

          <section className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-base font-semibold text-foreground">
                {t("reports.productMovement.tableTitle")}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {t("reports.productMovement.tableSubtitle")} ·{" "}
                <span className="tabular-nums">
                  {formatCount(data.meta.sellerCount)}
                </span>{" "}
                {t("reports.productMovement.sellers")}
              </p>
            </div>
            {data.items.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted">
                {t("reports.productMovement.empty")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[56rem] text-left text-sm">
                  <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">
                        {t("reports.productMovement.table.product")}
                      </th>
                      <th className="px-4 py-2.5 font-medium">
                        {t("reports.productMovement.table.sku")}
                      </th>
                      <th className="px-4 py-2.5 font-medium">
                        {t("reports.productMovement.table.band")}
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        {t("reports.productMovement.table.units")}
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        {t("reports.productMovement.table.revenue")}
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        {t("reports.productMovement.table.txns")}
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        {t("reports.productMovement.table.onHand")}
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        {t("reports.productMovement.table.daysCover")}
                      </th>
                      <th className="px-4 py-2.5 font-medium">
                        {t("reports.productMovement.table.stockStatus")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row) => (
                      <tr
                        key={row.productId}
                        className="cursor-pointer border-t border-border transition-colors hover:bg-canvas/80"
                        onClick={() => navigate(`/inventory/${row.productId}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            navigate(`/inventory/${row.productId}`);
                          }
                        }}
                        tabIndex={0}
                        role="link"
                        aria-label={t("reports.productMovement.openProduct")}
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-foreground">{row.name}</p>
                          {row.genericName ? (
                            <p className="text-xs text-muted">{row.genericName}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted">
                          {row.sku || "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <BandBadge band={row.band} />
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatCount(row.unitsSold)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatTaka(row.revenue)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatCount(row.txnCount)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatCount(row.onHand)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {row.daysOfCover == null
                            ? "—"
                            : formatCount(row.daysOfCover)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs font-medium text-muted">
                            {t(stockLabelKey(row.stockStatus))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-sm">
              <p className="text-muted">
                {t("reports.productMovement.pagination.showing")}{" "}
                <span className="tabular-nums text-foreground">
                  {totalRows === 0
                    ? "0"
                    : `${safePage * PAGE_SIZE + 1}–${Math.min(
                        (safePage + 1) * PAGE_SIZE,
                        totalRows,
                      )}`}
                </span>{" "}
                {t("reports.productMovement.pagination.of")}{" "}
                <span className="tabular-nums text-foreground">
                  {formatCount(totalRows)}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 0 || loading}
                  className={`rounded-md border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 ${TILE_FOCUS}`}
                  onClick={() => setOffset(Math.max(0, (safePage - 1) * PAGE_SIZE))}
                >
                  {t("reports.productMovement.pagination.prev")}
                </button>
                <button
                  type="button"
                  disabled={safePage >= pageCount - 1 || loading}
                  className={`rounded-md border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 ${TILE_FOCUS}`}
                  onClick={() => setOffset((safePage + 1) * PAGE_SIZE)}
                >
                  {t("reports.productMovement.pagination.next")}
                </button>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function KpiTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
    </article>
  );
}

function BandBadge({ band }: { band: ProductMovementPayload["items"][number]["band"] }) {
  const { t } = useLocale();
  const tone =
    band === "high_demand"
      ? "bg-primary/10 text-primary"
      : band === "low_sell"
        ? "bg-amber-50 text-amber-800"
        : band === "no_sales"
          ? "bg-slate-100 text-slate-700"
          : "bg-canvas text-muted";
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${tone}`}
    >
      {t(bandLabelKey(band))}
    </span>
  );
}

function bandFilterKey(band: ProductMovementBand): MessageKey {
  if (band === "all") return "reports.productMovement.band.all";
  if (band === "high_demand") return "reports.productMovement.band.high_demand";
  if (band === "steady") return "reports.productMovement.band.steady";
  if (band === "low_sell") return "reports.productMovement.band.low_sell";
  return "reports.productMovement.band.no_sales";
}

function bandLabelKey(
  band: ProductMovementPayload["items"][number]["band"],
): MessageKey {
  if (band === "high_demand") return "reports.productMovement.band.high_demand";
  if (band === "steady") return "reports.productMovement.band.steady";
  if (band === "low_sell") return "reports.productMovement.band.low_sell";
  return "reports.productMovement.band.no_sales";
}

function stockLabelKey(
  status: ProductMovementPayload["items"][number]["stockStatus"],
): MessageKey {
  if (status === "out") return "reports.productMovement.stock.out";
  if (status === "low") return "reports.productMovement.stock.low";
  if (status === "healthy") return "reports.productMovement.stock.healthy";
  return "reports.productMovement.stock.no_threshold";
}

function rangePresetKey(preset: ProductMovementRangePreset): MessageKey {
  if (preset === "last30") return "reports.productMovement.range.last30";
  if (preset === "last90") return "reports.productMovement.range.last90";
  return "reports.productMovement.range.last180";
}

function bandCount(
  data: ProductMovementPayload,
  band: Exclude<ProductMovementBand, "all">,
): number {
  if (band === "high_demand") return data.kpis.highDemandCount;
  if (band === "steady") return data.kpis.steadyCount;
  if (band === "low_sell") return data.kpis.lowSellCount;
  return data.kpis.noSalesCount;
}
