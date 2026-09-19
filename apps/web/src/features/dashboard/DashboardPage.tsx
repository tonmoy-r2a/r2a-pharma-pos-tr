import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Briefcase,
  Calculator,
  Clock,
  Package,
  Receipt,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useLocale, type MessageKey } from "@/i18n";
import { ApiError } from "@/lib/api";
import {
  formatCount,
  formatDateTime,
  formatPct,
  formatTaka,
  utcTodayStart,
  utcYmd,
} from "@/lib/format";
import {
  fetchOwnerDashboard,
  type DashboardKpiDelta,
  type DashboardRangePreset,
  type OwnerDashboardPayload,
} from "@/lib/ownerDashboard";
import { isLoyaltyOnlyTender } from "@/lib/loyaltyTender";
import { useOwnerPath } from "@/lib/OwnerPathProvider";
import { useTenantChrome } from "@/lib/TenantContextProvider";
import { SalesOverviewChart } from "./SalesOverviewChart";
import { StockPriorityPanel } from "./StockPriorityPanel";
import { TerminalsPresenceCard } from "./TerminalsPresenceCard";

const DOW_KEYS = [
  "dashboard.dow.0",
  "dashboard.dow.1",
  "dashboard.dow.2",
  "dashboard.dow.3",
  "dashboard.dow.4",
  "dashboard.dow.5",
  "dashboard.dow.6",
] as const;

const TILE_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

function weekdayKey(dateYmd: string): MessageKey {
  const parts = dateYmd.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return DOW_KEYS[dow] ?? "dashboard.dow.0";
}

function todaySalesPath(): string {
  const today = utcYmd(utcTodayStart());
  return `/sales?from=${today}&to=${today}`;
}

/**
 * Live Owner Dashboard (Batch G + Enhance D1).
 * Clickable KPIs / health / attention deep-link to live Owner screens.
 * Numbers come from GET /owner/dashboard. No invented KPIs.
 */
export function DashboardPage() {
  const { t } = useLocale();
  const { navigate } = useOwnerPath();
  const { storeName, tenantName } = useTenantChrome();
  const [preset, setPreset] = useState<DashboardRangePreset>("last7");
  const [data, setData] = useState<OwnerDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchOwnerDashboard(preset)
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setLoading(false);
        if (err instanceof ApiError) setError(err.message);
        else setError(t("dashboard.error"));
      });
    return () => {
      cancelled = true;
    };
  }, [preset, reload]);

  const subtitle = [tenantName?.trim(), storeName?.trim()]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="w-full px-5 py-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {t("page.dashboardTitle")}
          </h1>
          {subtitle ? (
            <p className="mt-1 truncate text-sm text-muted">{subtitle}</p>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="sr-only">{t("dashboard.range.label")}</span>
          <select
            value={preset}
            onChange={(e) =>
              setPreset(e.target.value as DashboardRangePreset)
            }
            className={`rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground ${TILE_FOCUS}`}
          >
            <option value="last7">{t("dashboard.range.last7")}</option>
            <option value="today">{t("dashboard.range.today")}</option>
            <option value="last30">{t("dashboard.range.last30")}</option>
          </select>
        </label>
      </div>

      {loading && !data ? (
        <p className="text-sm text-muted">{t("dashboard.loading")}</p>
      ) : null}

      {error && !data ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          <p className="text-destructive">{error}</p>
          <button
            type="button"
            className={`rounded-md border border-border px-3 py-1 text-foreground hover:bg-canvas ${TILE_FOCUS}`}
            onClick={() => setReload((n) => n + 1)}
          >
            {t("dashboard.retry")}
          </button>
        </div>
      ) : null}

      {data ? (
        <DashboardBody data={data} preset={preset} navigate={navigate} />
      ) : null}
    </div>
  );
}

function DashboardBody({
  data,
  preset,
  navigate,
}: {
  data: OwnerDashboardPayload;
  preset: DashboardRangePreset;
  navigate: (to: string) => void;
}) {
  const { t } = useLocale();
  const today = data.kpis.today;
  const vs = data.kpis.vsYesterday;
  const period = data.kpis.period;
  const health = data.inventoryHealth;
  const marginPct =
    today.sales > 0 ? (today.netProfit / today.sales) * 100 : null;
  const avgDelta = today.avgSale - period.avgSale;
  const healthMax = Math.max(
    1,
    health.lowStock,
    health.outOfStock,
    health.expiring30d,
    health.expiring90d ?? 0,
  );
  const chartSubtitle =
    preset === "today"
      ? t("dashboard.chart.subtitleToday")
      : preset === "last30"
        ? t("dashboard.chart.subtitle30")
        : t("dashboard.chart.subtitle7");
  const rangePill =
    preset === "today"
      ? t("dashboard.range.today")
      : preset === "last30"
        ? t("dashboard.range.last30")
        : t("dashboard.chart.weekToDate");
  const chartPoints = data.dailyBars.map((bar) => ({
    date: bar.date,
    label:
      data.dailyBars.length <= 7
        ? t(weekdayKey(bar.date))
        : bar.date.slice(5),
    sales: bar.sales,
    netProfit: bar.netProfit,
  }));
  const salesTodayHref = todaySalesPath();

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t("dashboard.kpi.todaySales")}
          value={formatTaka(today.sales)}
          delta={vs.sales}
          icon={<Banknote className="size-4" strokeWidth={1.75} />}
          ariaLabel={t("dashboard.aria.todaySales")}
          onOpen={() => navigate(salesTodayHref)}
        />
        <KpiCard
          label={t("dashboard.kpi.netProfit")}
          value={formatTaka(today.netProfit)}
          delta={vs.netProfit}
          hint={
            marginPct == null
              ? undefined
              : `${formatPct(marginPct)}% ${t("dashboard.kpi.marginAfterCogs")}`
          }
          icon={<Wallet className="size-4" strokeWidth={1.75} />}
          ariaLabel={t("dashboard.aria.netProfit")}
          onOpen={() => navigate("/reports/sales")}
        />
        <KpiCard
          label={t("dashboard.kpi.transactions")}
          value={formatCount(today.txnCount)}
          delta={vs.txnCount}
          icon={<Receipt className="size-4" strokeWidth={1.75} />}
          ariaLabel={t("dashboard.aria.transactions")}
          onOpen={() => navigate(salesTodayHref)}
        />
        <KpiCard
          label={t("dashboard.kpi.avgSale")}
          value={formatTaka(today.avgSale)}
          delta={vs.avgSale}
          hint={
            period.txnCount > 0
              ? `${avgDelta >= 0 ? "+" : "−"}${formatTaka(Math.abs(avgDelta))} ${t("dashboard.kpi.vsPeriodAvg")}`
              : undefined
          }
          icon={<Calculator className="size-4" strokeWidth={1.75} />}
          ariaLabel={t("dashboard.aria.avgSale")}
          onOpen={() => navigate(salesTodayHref)}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <SalesOverviewChart
              points={chartPoints}
              subtitle={chartSubtitle}
              rangePill={rangePill}
            />
          </section>

          <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  {t("dashboard.recentSales")}
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  {t("dashboard.recentSalesHint")}
                </p>
              </div>
              <button
                type="button"
                className={`text-sm font-medium text-primary hover:underline ${TILE_FOCUS} rounded-sm`}
                onClick={() => navigate("/sales")}
              >
                {t("dashboard.viewAllSales")}
              </button>
            </div>
            <RecentSalesTable
              rows={data.recentSales}
              onOpen={(id) => navigate(`/sales/${id}`)}
            />
          </section>
        </div>

        <div className="flex flex-col gap-3">
          <TerminalsPresenceCard />
          <StockPriorityPanel navigate={navigate} />
          <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                {t("dashboard.inventoryHealth")}
              </h2>
              <button
                type="button"
                aria-label={t("dashboard.aria.productMovement")}
                className={`inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline ${TILE_FOCUS} rounded-sm`}
                onClick={() => navigate("/reports/product-movement?preset=last90")}
              >
                {t("dashboard.productMovementCta")}
                <ArrowRight className="size-3.5" strokeWidth={1.75} />
              </button>
            </div>
            <ul className="flex flex-col gap-2.5">
              <HealthBar
                label={t("dashboard.health.lowStock")}
                count={health.lowStock}
                max={healthMax}
                barClass="bg-orange-400"
                ariaLabel={t("dashboard.aria.healthLow")}
                onOpen={() => navigate("/inventory?tab=low")}
              />
              <HealthBar
                label={t("dashboard.health.outOfStock")}
                count={health.outOfStock}
                max={healthMax}
                barClass="bg-red-500"
                ariaLabel={t("dashboard.aria.healthOut")}
                onOpen={() => navigate("/inventory?tab=out")}
              />
              <HealthBar
                label={t("dashboard.health.expiring30d")}
                count={health.expiring30d}
                max={healthMax}
                barClass="bg-amber-500"
                ariaLabel={t("dashboard.aria.healthExp30")}
                onOpen={() => navigate("/inventory?tab=expiring30")}
              />
              <HealthBar
                label={t("dashboard.health.expiring90d")}
                count={health.expiring90d ?? 0}
                max={healthMax}
                barClass="bg-primary"
                ariaLabel={t("dashboard.aria.healthExp90")}
                onOpen={() => navigate("/inventory?tab=expiring90")}
              />
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                {t("dashboard.fefoTitle")}
              </h2>
              <ShieldCheck
                className="size-4 shrink-0 text-primary"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={`rounded-lg bg-amber-50 px-2.5 py-3 text-left transition-colors hover:bg-amber-100/80 ${TILE_FOCUS}`}
                aria-label={t("dashboard.aria.fefoToday")}
                onClick={() => navigate("/audit")}
              >
                <p className="text-xl font-semibold tabular-nums text-amber-800">
                  {formatCount(data.fefoOverrides.today)}
                </p>
                <p className="text-[11px] leading-snug text-amber-800/80">
                  {t("dashboard.fefo.overridesToday")}
                </p>
              </button>
              <button
                type="button"
                className={`rounded-lg bg-sky-50 px-2.5 py-3 text-left transition-colors hover:bg-sky-100/80 ${TILE_FOCUS}`}
                aria-label={t("dashboard.aria.fefoWeek")}
                onClick={() => navigate("/audit")}
              >
                <p className="text-xl font-semibold tabular-nums text-sky-800">
                  {formatCount(data.fefoOverrides.week)}
                </p>
                <p className="text-[11px] leading-snug text-sky-800/80">
                  {t("dashboard.fefo.thisWeek")}
                </p>
              </button>
              <div className="rounded-lg bg-rose-50 px-2.5 py-3">
                <p className="text-xl font-semibold tabular-nums text-rose-800">
                  {formatTaka(data.expiringStockValue)}
                </p>
                <p className="text-[11px] leading-snug text-rose-800/80">
                  {t("dashboard.fefo.expiringValue")}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label={t("dashboard.aria.viewAudit")}
              className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15 ${TILE_FOCUS}`}
              onClick={() => navigate("/audit")}
            >
              {t("dashboard.fefo.viewAudit")}
              <ArrowRight className="size-4" strokeWidth={1.75} />
            </button>
          </section>

          <AttentionCard data={data} navigate={navigate} />
          <StaffShiftsCard data={data} navigate={navigate} />
        </div>
      </div>
    </div>
  );
}

function AttentionCard({
  data,
  navigate,
}: {
  data: OwnerDashboardPayload;
  navigate: (to: string) => void;
}) {
  const { t } = useLocale();
  const out = data.inventoryHealth.outOfStock;
  const exp30 = data.inventoryHealth.expiring30d;
  const fefo = data.fefoOverrides.today;

  return (
    <section className="rounded-xl border border-amber-200/80 border-l-4 border-l-amber-500 bg-surface p-4 sm:p-5">
      <h2 className="mb-2 text-base font-semibold tracking-tight text-foreground">
        {t("dashboard.attention.title")}
      </h2>
      <ul className="flex flex-col">
        <AttentionRow
          icon={<Package className="size-4 text-red-600" strokeWidth={1.75} />}
          title={`${formatCount(out)} ${t("dashboard.attention.outOfStock")}`}
          subtitle={t("dashboard.attention.outOfStockHint")}
          ariaLabel={t("dashboard.aria.attentionOut")}
          onOpen={() => navigate("/inventory?tab=out")}
        />
        <AttentionRow
          icon={<Clock className="size-4 text-amber-600" strokeWidth={1.75} />}
          title={`${formatCount(exp30)} ${t("dashboard.attention.expiring30d")}`}
          subtitle={t("dashboard.attention.expiringHint")}
          ariaLabel={t("dashboard.aria.attentionExp30")}
          onOpen={() => navigate("/inventory/expiry")}
        />
        <AttentionRow
          icon={
            <AlertTriangle className="size-4 text-red-600" strokeWidth={1.75} />
          }
          title={t("dashboard.attention.cashVariance")}
          subtitle={t("dashboard.attention.cashVarianceHint")}
          ariaLabel={t("dashboard.aria.attentionCash")}
          onOpen={() => navigate("/staff/shifts")}
        />
        <AttentionRow
          icon={
            <ShieldCheck className="size-4 text-amber-600" strokeWidth={1.75} />
          }
          title={`${formatCount(fefo)} ${t("dashboard.attention.fefoToday")}`}
          subtitle={t("dashboard.attention.fefoHint")}
          ariaLabel={t("dashboard.aria.attentionFefo")}
          onOpen={() => navigate("/audit")}
        />
      </ul>
    </section>
  );
}

function AttentionRow({
  icon,
  title,
  subtitle,
  onOpen,
  ariaLabel,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onOpen: () => void;
  ariaLabel: string;
}) {
  return (
    <li>
      <button
        type="button"
        aria-label={ariaLabel}
        className={`-mx-1 flex w-[calc(100%+0.5rem)] items-start gap-3 rounded-lg px-1 py-2.5 text-left transition-colors hover:bg-amber-50/60 ${TILE_FOCUS}`}
        onClick={onOpen}
      >
        <span className="mt-0.5 shrink-0">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">
            {title}
          </span>
          <span className="mt-0.5 block text-xs text-muted">{subtitle}</span>
        </span>
        <ArrowUpRight
          className="size-4 shrink-0 text-muted"
          strokeWidth={1.75}
        />
      </button>
    </li>
  );
}

function StaffShiftsCard({
  data,
  navigate,
}: {
  data: OwnerDashboardPayload;
  navigate: (to: string) => void;
}) {
  const { t } = useLocale();
  const cashiers = data.staff?.activeCashiers ?? 0;
  const openShifts = data.staff?.openShifts;
  const variance = data.staff?.cashVarianceToday;

  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {t("dashboard.staff.title")}
        </h2>
        <button
          type="button"
          aria-label={t("dashboard.aria.staffReports")}
          className={`text-sm font-medium text-primary hover:underline ${TILE_FOCUS} rounded-sm`}
          onClick={() => navigate("/reports")}
        >
          {t("dashboard.staff.viewReports")}
        </button>
      </div>
      <button
        type="button"
        aria-label={t("dashboard.aria.staffVariance")}
        className={`mb-2 flex w-full items-center justify-between rounded-lg bg-amber-50 px-3 py-2.5 text-left transition-colors hover:bg-amber-100/70 ${TILE_FOCUS}`}
        onClick={() => navigate("/staff/shifts")}
      >
        <p className="text-sm text-foreground">
          {t("dashboard.staff.cashVariance")}
        </p>
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {variance == null ? "—" : formatTaka(variance)}
        </p>
      </button>
      <button
        type="button"
        aria-label={t("dashboard.aria.staffCashiers")}
        className={`flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left text-sm text-muted transition-colors hover:bg-canvas hover:text-foreground ${TILE_FOCUS}`}
        onClick={() => navigate("/staff/shifts")}
      >
        <Briefcase className="size-4" strokeWidth={1.75} />
        <span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatCount(cashiers)}
          </span>{" "}
          {t("dashboard.staff.activeCashiers")}
        </span>
      </button>
      {openShifts != null ? (
        <button
          type="button"
          aria-label={t("dashboard.aria.staffOpenShifts")}
          className={`mt-1 flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left text-sm text-muted transition-colors hover:bg-canvas hover:text-foreground ${TILE_FOCUS}`}
          onClick={() => navigate("/staff/shifts")}
        >
          <Clock className="size-4" strokeWidth={1.75} />
          <span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatCount(openShifts)}
            </span>{" "}
            {t("dashboard.staff.openShifts")}
          </span>
        </button>
      ) : null}
    </section>
  );
}

function KpiCard({
  label,
  value,
  delta,
  hint,
  icon,
  onOpen,
  ariaLabel,
}: {
  label: string;
  value: string;
  delta: DashboardKpiDelta;
  hint?: string;
  icon: ReactNode;
  onOpen: () => void;
  ariaLabel: string;
}) {
  const { t } = useLocale();
  let trendClass = "text-muted";
  let trendText = `— ${t("dashboard.kpi.steady")}`;
  if (delta.trend === "up") {
    trendClass = "text-emerald-600";
    trendText =
      delta.deltaPct == null
        ? `↑ ${t("dashboard.kpi.vsYesterday")}`
        : `↑ +${formatPct(delta.deltaPct)}% ${t("dashboard.kpi.vsYesterday")}`;
  } else if (delta.trend === "down") {
    trendClass = "text-destructive";
    trendText =
      delta.deltaPct == null
        ? `↓ ${t("dashboard.kpi.vsYesterday")}`
        : `↓ −${formatPct(delta.deltaPct)}% ${t("dashboard.kpi.vsYesterday")}`;
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onOpen}
      className={`rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/3 ${TILE_FOCUS}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        <span className="text-muted">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </p>
      <p className={`mt-1 text-xs ${hint ? "text-muted" : trendClass}`}>
        {hint ?? trendText}
      </p>
    </button>
  );
}

function HealthBar({
  label,
  count,
  max,
  barClass,
  onOpen,
  ariaLabel,
}: {
  label: string;
  count: number;
  max: number;
  barClass: string;
  onOpen: () => void;
  ariaLabel: string;
}) {
  const pct = max > 0 ? Math.min(100, (count / max) * 100) : 0;
  return (
    <li>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onOpen}
        className={`flex w-full flex-col gap-1.5 rounded-lg px-1 py-1 text-left transition-colors hover:bg-canvas ${TILE_FOCUS}`}
      >
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-foreground">{label}</span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatCount(count)}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${barClass}`}
            style={{ width: `${count > 0 ? Math.max(pct, 8) : 0}%` }}
          />
        </div>
      </button>
    </li>
  );
}

function RecentSalesTable({
  rows,
  onOpen,
}: {
  rows: OwnerDashboardPayload["recentSales"];
  onOpen: (id: string) => void;
}) {
  const { t } = useLocale();

  if (rows.length === 0) {
    return (
      <p className="px-1 py-6 text-sm text-muted">{t("dashboard.emptySales")}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-slate-50 text-xs font-medium uppercase tracking-wide text-muted">
            <th className="pb-2 pr-3 font-medium">
              {t("dashboard.col.transaction")}
            </th>
            <th className="pb-2 pr-3 font-medium">
              {t("dashboard.col.customer")}
            </th>
            <th className="pb-2 pr-3 font-medium">
              {t("dashboard.col.payment")}
            </th>
            <th className="pb-2 pr-3 font-medium">
              {t("dashboard.col.cashier")}
            </th>
            <th className="pb-2 text-right font-medium">
              {t("dashboard.col.amount")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={`cursor-pointer border-b border-border last:border-0 hover:bg-canvas ${TILE_FOCUS}`}
              onClick={() => onOpen(row.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onOpen(row.id);
              }}
              tabIndex={0}
            >
              <td className="py-3 pr-3">
                <p className="font-semibold text-foreground">
                  {row.receiptNo || "—"}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatDateTime(row.soldAt)}
                </p>
              </td>
              <td className="py-3 pr-3 text-foreground">
                {row.customerName?.trim() || t("dashboard.walkIn")}
              </td>
              <td className="py-3 pr-3">
                <PaymentPills
                  methods={row.paymentMethods}
                  mfsProvider={row.mfsProvider}
                  loyaltyUsed={row.loyaltyUsed ?? 0}
                  payments={row.paymentAmounts}
                />
              </td>
              <td className="py-3 pr-3 text-foreground">{row.cashierName}</td>
              <td className="py-3 text-right font-semibold tabular-nums text-foreground">
                {formatTaka(row.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function mfsProviderLabel(
  provider: string | null | undefined,
): string | null {
  if (provider === "BKASH") return "bKash";
  if (provider === "NAGAD") return "Nagad";
  if (provider === "ROCKET") return "Rocket";
  return null;
}

function mfsPillClass(provider: string | null | undefined): string {
  if (provider === "BKASH") {
    return "rounded-full bg-[#E2136E]/10 px-2.5 py-0.5 text-xs font-medium text-[#E2136E]";
  }
  if (provider === "NAGAD") {
    return "rounded-full bg-[#F7941D]/15 px-2.5 py-0.5 text-xs font-medium text-[#ED1C24]";
  }
  if (provider === "ROCKET") {
    return "rounded-full bg-[#8C3494]/10 px-2.5 py-0.5 text-xs font-medium text-[#8C3494]";
  }
  return "rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700";
}

function PaymentPills({
  methods,
  mfsProvider,
  loyaltyUsed,
  payments,
}: {
  methods: string[];
  mfsProvider?: string | null;
  loyaltyUsed: number;
  payments?: Array<{ method: string; amount: number }>;
}) {
  const { t } = useLocale();
  if (
    payments &&
    isLoyaltyOnlyTender({ loyaltyUsed, payments })
  ) {
    return (
      <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">
        {t("dashboard.payment.loyalty")}
      </span>
    );
  }
  if (methods.length === 0) return <span className="text-muted">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {methods.map((method) => {
        if (method === "MFS") {
          const brand = mfsProviderLabel(mfsProvider);
          return (
            <span key={method} className={mfsPillClass(mfsProvider)}>
              {brand
                ? `${t("dashboard.payment.mfs")}:${brand}`
                : t("dashboard.payment.mfs")}
            </span>
          );
        }
        const key =
          method === "CASH"
            ? "dashboard.payment.cash"
            : "dashboard.payment.card";
        const pill =
          method === "CARD"
            ? "rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700"
            : "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700";
        return (
          <span key={method} className={pill}>
            {t(key)}
          </span>
        );
      })}
    </span>
  );
}
