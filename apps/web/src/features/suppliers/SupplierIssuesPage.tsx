/**
 * Supplier Issues aggregator (Prod P9). Content region only — chrome is Batch B.
 * Composes live attention from GET /owner/suppliers — no new API / no tickets.
 * Route lock: `/suppliers/issues`.
 */
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  PackageX,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, type MessageKey } from "@/i18n";
import { ApiError } from "@/lib/api";
import { formatCount } from "@/lib/format";
import { useOwnerPath } from "@/lib/OwnerPathProvider";
import {
  fetchSuppliers,
  type OverdueOrder,
  type SupplierAttention,
} from "@/lib/suppliers";

type IssueKind = "overdue" | "openPo" | "expiryReturn" | "onHold";

type IssueRow = {
  id: string;
  kind: IssueKind;
  title: string;
  detail: string;
  href: string;
};

type Translate = (key: MessageKey) => string;

const EMPTY_ATTENTION: SupplierAttention = {
  overdueOrders: [],
  openOrders: 0,
  returnQueue: 0,
  onHoldSuppliers: [],
};

export function SupplierIssuesPage() {
  const { t } = useLocale();
  const { navigate } = useOwnerPath();
  const [attention, setAttention] = useState<SupplierAttention>(EMPTY_ATTENTION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchSuppliers({ limit: 1, offset: 0 })
      .then((result) => {
        if (cancelled) return;
        setAttention(result.attention);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAttention(EMPTY_ATTENTION);
        setLoading(false);
        setError(
          err instanceof ApiError
            ? err.message
            : t("suppliers.issues.error"),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [reload, t]);

  const rows = useMemo(
    () => buildIssueRows(attention, t),
    [attention, t],
  );

  const counts = {
    overdue: attention.overdueOrders.length,
    openPo: attention.openOrders,
    expiryReturn: attention.returnQueue,
    onHold: attention.onHoldSuppliers.length,
  };
  const totalIssues =
    counts.overdue +
    (counts.openPo > 0 ? 1 : 0) +
    (counts.expiryReturn > 0 ? 1 : 0) +
    counts.onHold;

  return (
    <div className="w-full px-5 py-4">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted">
            <button
              type="button"
              className="hover:text-primary"
              onClick={() => navigate("/suppliers")}
            >
              {t("page.suppliersTitle")}
            </button>
            <span aria-hidden="true">›</span>
            <span>{t("suppliers.issues.title")}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("suppliers.issues.title")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t("suppliers.issues.subtitle")}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-canvas"
          onClick={() => navigate("/suppliers")}
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          {t("suppliers.issues.back")}
        </button>
      </div>

      {loading && rows.length === 0 && !error ? (
        <p className="text-sm text-muted">{t("suppliers.issues.loading")}</p>
      ) : null}

      {error ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          <p className="text-destructive">{error}</p>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1 text-foreground hover:bg-canvas"
            onClick={() => setReload((n) => n + 1)}
          >
            {t("suppliers.issues.retry")}
          </button>
        </div>
      ) : null}

      {!loading || attention !== EMPTY_ATTENTION ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label={t("suppliers.issues.kpi.overdue")}
              value={formatCount(counts.overdue)}
              tone="red"
              icon={<Truck className="size-4 text-red-600" strokeWidth={1.75} />}
            />
            <KpiCard
              label={t("suppliers.issues.kpi.openPo")}
              value={formatCount(counts.openPo)}
              tone="teal"
              icon={
                <ShoppingCart className="size-4 text-primary" strokeWidth={1.75} />
              }
            />
            <KpiCard
              label={t("suppliers.issues.kpi.returns")}
              value={formatCount(counts.expiryReturn)}
              tone="orange"
              icon={
                <PackageX className="size-4 text-orange-600" strokeWidth={1.75} />
              }
            />
            <KpiCard
              label={t("suppliers.issues.kpi.onHold")}
              value={formatCount(counts.onHold)}
              tone="slate"
              icon={
                <ShieldCheck className="size-4 text-slate-600" strokeWidth={1.75} />
              }
            />
          </div>

          <section className="rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">
                {t("suppliers.issues.listTitle")}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {t("suppliers.issues.listSubtitle").replace(
                  "{count}",
                  formatCount(totalIssues),
                )}
              </p>
            </div>

            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                <AlertTriangle
                  className="size-8 text-muted"
                  strokeWidth={1.5}
                />
                <p className="text-sm font-medium text-foreground">
                  {t("suppliers.issues.empty")}
                </p>
                <p className="text-xs text-muted">
                  {t("suppliers.issues.emptyHint")}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 px-5 py-3.5 text-left hover:bg-canvas"
                      onClick={() => navigate(row.href)}
                    >
                      <KindIcon kind={row.kind} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {row.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">{row.detail}</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
                          {t("suppliers.issues.open")}
                          <ArrowRight className="size-3" strokeWidth={1.75} />
                        </p>
                      </div>
                      <KindBadge kind={row.kind} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function buildIssueRows(attention: SupplierAttention, t: Translate): IssueRow[] {
  const rows: IssueRow[] = [];

  for (const order of attention.overdueOrders) {
    rows.push({
      id: `overdue-${order.id}`,
      kind: "overdue",
      title: overdueTitle(order),
      detail: t("suppliers.issues.detail.overdue").replace(
        "{days}",
        formatCount(order.daysOverdue),
      ),
      href: `/purchasing/${encodeURIComponent(order.id)}`,
    });
  }

  if (attention.openOrders > 0) {
    rows.push({
      id: "open-po-summary",
      kind: "openPo",
      title: `${formatCount(attention.openOrders)} ${t("suppliers.attention.openOrders")}`,
      detail: t("suppliers.attention.openOrdersHint"),
      href: "/purchasing",
    });
  }

  if (attention.returnQueue > 0) {
    rows.push({
      id: "returns-summary",
      kind: "expiryReturn",
      title: `${formatCount(attention.returnQueue)} ${t("suppliers.attention.expiryReturns")}`,
      detail: t("suppliers.attention.expiryReturnsHint"),
      href: "/suppliers/returns",
    });
  }

  for (const supplier of attention.onHoldSuppliers) {
    rows.push({
      id: `hold-${supplier.id}`,
      kind: "onHold",
      title: supplier.name,
      detail: t("suppliers.issues.detail.onHold"),
      href: `/suppliers/${encodeURIComponent(supplier.id)}`,
    });
  }

  return rows;
}

function overdueTitle(order: OverdueOrder): string {
  const supplier = order.supplierName ? ` · ${order.supplierName}` : "";
  return `${order.poNumber}${supplier}`;
}

function KindIcon({ kind }: { kind: IssueKind }) {
  if (kind === "overdue") {
    return <Truck className="mt-0.5 size-4 shrink-0 text-red-600" strokeWidth={1.75} />;
  }
  if (kind === "openPo") {
    return (
      <ShoppingCart className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} />
    );
  }
  if (kind === "expiryReturn") {
    return (
      <PackageX className="mt-0.5 size-4 shrink-0 text-orange-600" strokeWidth={1.75} />
    );
  }
  return (
    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-slate-600" strokeWidth={1.75} />
  );
}

function KindBadge({ kind }: { kind: IssueKind }) {
  const { t } = useLocale();
  const cls =
    kind === "overdue"
      ? "bg-red-100 text-red-700"
      : kind === "openPo"
        ? "bg-teal-100 text-teal-800"
        : kind === "expiryReturn"
          ? "bg-orange-100 text-orange-800"
          : "bg-slate-100 text-slate-700";
  const label =
    kind === "overdue"
      ? t("suppliers.issues.kind.overdue")
      : kind === "openPo"
        ? t("suppliers.issues.kind.openPo")
        : kind === "expiryReturn"
          ? t("suppliers.issues.kind.returns")
          : t("suppliers.issues.kind.onHold");
  return (
    <span
      className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: "red" | "teal" | "orange" | "slate";
}) {
  const valueCls =
    tone === "red"
      ? "text-red-600"
      : tone === "teal"
        ? "text-primary"
        : tone === "orange"
          ? "text-orange-600"
          : "text-slate-700";
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        <span className="text-muted">{icon}</span>
      </div>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${valueCls}`}>
        {value}
      </p>
    </article>
  );
}
