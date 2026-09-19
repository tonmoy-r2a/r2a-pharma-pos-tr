import {
  AlertCircle,
  Check,
  ClipboardList,
  FileText,
  Loader2,
  MoreHorizontal,
  PackageMinus,
  Printer,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale } from "@/i18n";
import { ApiError } from "@/lib/api";
import {
  formatCount,
  formatDateTime,
  formatTaka,
  formatUtcDate,
} from "@/lib/format";
import { useOwnerPath } from "@/lib/OwnerPathProvider";
import {
  completeReturnManifest,
  decideReturnManifest,
  dispatchReturnManifest,
  fetchReturnManifest,
  type ReturnManifestDetail,
  type ReturnManifestStatus,
  type ReturnSupplierDecision,
} from "@/lib/returnQueue";

type ModalKind = "dispatch" | "decision" | "complete" | null;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function newOperationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `dispatch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Return Manifest Details (Batch AC). One page for all statuses.
 * Dispatch posts stock via POST /owner/return-manifests/:id/dispatch.
 * Decision + Complete use the Batch R lifecycle APIs. Export / Print /
 * More Actions stay disabled. Supplier Return Policy is live Supplier data.
 */
export function ManifestDetailsPage({ manifestId }: { manifestId: string }) {
  const { t } = useLocale();
  const { navigate } = useOwnerPath();

  const [manifest, setManifest] = useState<ReturnManifestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [modal, setModal] = useState<ModalKind>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchReturnManifest(manifestId)
      .then((payload) => {
        if (cancelled) return;
        setManifest(payload);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setManifest(null);
        setLoading(false);
        if (err instanceof ApiError && err.statusCode === 404) {
          setError(t("suppliers.manifestDetail.notFound"));
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError(t("suppliers.manifestDetail.error"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [manifestId, reload, t]);

  function onUpdated(next: ReturnManifestDetail) {
    setManifest(next);
    setModal(null);
  }

  return (
    <div className="w-full px-5 py-4">
      <nav aria-label={t("header.breadcrumb")} className="mb-3 text-sm text-muted">
        <button
          type="button"
          className="hover:text-foreground hover:underline"
          onClick={() => navigate("/suppliers")}
        >
          {t("page.suppliersTitle")}
        </button>
        <span className="px-1.5">›</span>
        <button
          type="button"
          className="hover:text-foreground hover:underline"
          onClick={() => navigate("/suppliers/returns")}
        >
          {t("suppliers.returns.title")}
        </button>
        <span className="px-1.5">›</span>
        <span className="text-foreground">{t("suppliers.manifestDetail.crumb")}</span>
      </nav>

      {loading && !manifest ? (
        <p className="text-sm text-muted">{t("suppliers.manifestDetail.loading")}</p>
      ) : null}

      {error && !manifest ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          <p className="text-destructive">{error}</p>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1 text-foreground hover:bg-canvas"
            onClick={() => setReload((n) => n + 1)}
          >
            {t("suppliers.manifestDetail.retry")}
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1 text-foreground hover:bg-canvas"
            onClick={() => navigate("/suppliers/returns")}
          >
            {t("suppliers.manifestDetail.back")}
          </button>
        </div>
      ) : null}

      {manifest ? (
        <ManifestDetailsBody
          manifest={manifest}
          onOpenDispatch={() => setModal("dispatch")}
          onOpenDecision={() => setModal("decision")}
          onOpenComplete={() => setModal("complete")}
        />
      ) : null}

      {manifest && modal === "dispatch" ? (
        <DispatchModal
          manifest={manifest}
          onCancel={() => setModal(null)}
          onDispatched={onUpdated}
        />
      ) : null}
      {manifest && modal === "decision" ? (
        <DecisionModal
          manifest={manifest}
          onCancel={() => setModal(null)}
          onDecided={onUpdated}
        />
      ) : null}
      {manifest && modal === "complete" ? (
        <CompleteModal
          manifest={manifest}
          onCancel={() => setModal(null)}
          onCompleted={onUpdated}
        />
      ) : null}
    </div>
  );
}

function ManifestDetailsBody({
  manifest,
  onOpenDispatch,
  onOpenDecision,
  onOpenComplete,
}: {
  manifest: ReturnManifestDetail;
  onOpenDispatch: () => void;
  onOpenDecision: () => void;
  onOpenComplete: () => void;
}) {
  const { t } = useLocale();

  const totals = useMemo(() => {
    const units = manifest.lines.reduce((sum, line) => sum + line.returnQty, 0);
    const cost = roundMoney(
      manifest.lines.reduce(
        (sum, line) => sum + line.returnQty * line.costPerBase,
        0,
      ),
    );
    return { units, cost, batches: manifest.lines.length };
  }, [manifest.lines]);

  const posted = manifest.status !== "PREPARED";
  const canDispatch = manifest.status === "PREPARED";
  const canDecide = manifest.status === "DISPATCHED";
  const canComplete = manifest.status === "ACCEPTED";
  const readOnly =
    manifest.status === "REJECTED" || manifest.status === "COMPLETED";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {manifest.srmNumber}
            </h1>
            <StatusBadge status={manifest.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {manifest.supplier.name}
            {manifest.supplierReference ? ` · ${manifest.supplierReference}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled
            aria-disabled="true"
            title={t("suppliers.manifestDetail.exportSoon")}
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted"
          >
            <FileText className="size-3.5" strokeWidth={1.75} />
            {t("suppliers.manifestDetail.export")}
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title={t("suppliers.manifestDetail.printSoon")}
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted"
          >
            <Printer className="size-3.5" strokeWidth={1.75} />
            {t("suppliers.manifestDetail.print")}
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title={t("suppliers.manifestDetail.moreActionsSoon")}
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted"
          >
            <MoreHorizontal className="size-3.5" strokeWidth={1.75} />
            {t("suppliers.manifestDetail.moreActions")}
          </button>
          {canDispatch ? (
            <PrimaryCta
              label={t("suppliers.manifestDetail.dispatch")}
              icon={<Truck className="size-3.5" strokeWidth={1.75} />}
              onClick={onOpenDispatch}
            />
          ) : null}
          {canDecide ? (
            <PrimaryCta
              label={t("suppliers.manifestDetail.decision")}
              icon={<ClipboardList className="size-3.5" strokeWidth={1.75} />}
              onClick={onOpenDecision}
            />
          ) : null}
          {canComplete ? (
            <PrimaryCta
              label={t("suppliers.manifestDetail.complete")}
              icon={<Check className="size-3.5" strokeWidth={1.75} />}
              onClick={onOpenComplete}
            />
          ) : null}
          {readOnly ? (
            <span className="inline-flex items-center rounded-md border border-border bg-canvas px-3 py-1.5 text-sm text-muted">
              {t("suppliers.manifestDetail.readOnly")}
            </span>
          ) : null}
        </div>
      </div>

      <StatusStepper status={manifest.status} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={t("suppliers.manifestDetail.kpi.batches")}
          value={formatCount(totals.batches)}
          icon={<ClipboardList className="size-4 text-muted" strokeWidth={1.75} />}
        />
        <KpiCard
          label={t("suppliers.manifestDetail.kpi.units")}
          value={`${formatCount(totals.units)} ${t("suppliers.returns.pcs")}`}
          icon={<PackageMinus className="size-4 text-amber-600" strokeWidth={1.75} />}
        />
        <KpiCard
          label={t("suppliers.manifestDetail.kpi.cost")}
          value={formatTaka(totals.cost)}
          icon={<FileText className="size-4 text-primary" strokeWidth={1.75} />}
        />
        <KpiCard
          label={t("suppliers.manifestDetail.kpi.inventory")}
          value={
            posted
              ? t("suppliers.manifestDetail.inventory.posted")
              : t("suppliers.manifestDetail.inventory.pending")
          }
          hint={
            posted
              ? t("suppliers.manifestDetail.inventory.postedHint")
              : `${formatTaka(totals.cost)} ${t("suppliers.manifestDetail.inventory.projectedHint")}`
          }
          icon={<Truck className="size-4 text-muted" strokeWidth={1.75} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-4">
          <section className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                {t("suppliers.manifestDetail.infoTitle")}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-3">
              <InfoField
                label={t("suppliers.manifestDetail.supplier")}
                value={manifest.supplier.name}
              />
              <InfoField
                label={t("suppliers.manifestDetail.branch")}
                value={manifest.store.name}
              />
              <InfoField
                label={t("suppliers.manifestDetail.preparedBy")}
                value={manifest.preparedBy.name}
              />
              <InfoField
                label={t("suppliers.manifestDetail.preparedAt")}
                value={formatDateTime(manifest.preparedAt)}
              />
              <InfoField
                label={t("suppliers.manifestDetail.returnReason")}
                value={t("suppliers.manifest.returnReasonExpiry")}
              />
              <InfoField
                label={t("suppliers.manifestDetail.supplierReference")}
                value={manifest.supplierReference?.trim() || "—"}
              />
              <div className="sm:col-span-3">
                <InfoField
                  label={t("suppliers.manifestDetail.notes")}
                  value={manifest.notes?.trim() || "—"}
                />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                {t("suppliers.manifestDetail.itemsTitle")}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    <th className="px-4 py-2.5">{t("suppliers.manifest.col.medicine")}</th>
                    <th className="px-4 py-2.5">{t("suppliers.manifest.col.batch")}</th>
                    <th className="px-4 py-2.5">{t("suppliers.manifest.col.expiry")}</th>
                    <th className="px-4 py-2.5 text-right">
                      {t("suppliers.manifest.col.returnQty")}
                    </th>
                    <th className="px-4 py-2.5 text-right">
                      {t("suppliers.manifest.col.costValue")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {manifest.lines.map((line) => (
                    <tr key={line.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {line.batch.product.name}
                        </p>
                        {line.batch.product.genericName ? (
                          <p className="text-xs text-muted">
                            {line.batch.product.genericName}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {line.batch.batchNumber}
                      </td>
                      <td className="px-4 py-3">
                        {formatUtcDate(line.batch.expiryDate)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCount(line.returnQty)} {t("suppliers.returns.pcs")}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatTaka(roundMoney(line.returnQty * line.costPerBase))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <ActivityPanel manifest={manifest} />
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-foreground">
              {t("suppliers.manifest.policy.title")}
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                  {t("suppliers.manifest.policy.expiryReturns")}
                </dt>
                <dd className="mt-0.5 text-foreground">
                  {manifest.supplier.expiryReturnsAccepted
                    ? t("suppliers.manifest.policy.accepted")
                    : t("suppliers.manifest.policy.notAccepted")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                  {t("suppliers.manifest.policy.minDays")}
                </dt>
                <dd className="mt-0.5 text-foreground">
                  {manifest.supplier.minDaysBeforeExpiry != null
                    ? formatCount(manifest.supplier.minDaysBeforeExpiry)
                    : t("suppliers.manifest.policy.none")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                  {t("suppliers.manifest.policy.instructions")}
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-foreground">
                  {manifest.supplier.returnNotes?.trim() ||
                    t("suppliers.manifest.policy.none")}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted">
              {t("suppliers.manifest.policy.hint")}
            </p>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-foreground">
              {t("suppliers.manifestDetail.inventory.title")}
            </h2>
            <p className="mt-2 text-sm text-foreground">
              {posted
                ? t("suppliers.manifestDetail.inventory.postedBody")
                : t("suppliers.manifestDetail.inventory.pendingBody")}
            </p>
            <p className="mt-3 text-xs text-muted">
              {posted
                ? `${formatCount(totals.units)} ${t("suppliers.returns.pcs")} · ${formatTaka(totals.cost)}`
                : `${t("suppliers.manifestDetail.inventory.projected")}: ${formatCount(totals.units)} ${t("suppliers.returns.pcs")} · ${formatTaka(totals.cost)}`}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PrimaryCta({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: ReturnManifestStatus }) {
  const { t } = useLocale();
  const cls =
    status === "PREPARED"
      ? "bg-sky-100 text-sky-800"
      : status === "DISPATCHED"
        ? "bg-amber-100 text-amber-800"
        : status === "ACCEPTED"
          ? "bg-emerald-100 text-emerald-800"
          : status === "COMPLETED"
            ? "bg-slate-100 text-slate-700"
            : "bg-red-100 text-red-800";
  const label =
    status === "PREPARED"
      ? "suppliers.manifestDetail.status.PREPARED"
      : status === "DISPATCHED"
        ? "suppliers.manifestDetail.status.DISPATCHED"
        : status === "ACCEPTED"
          ? "suppliers.manifestDetail.status.ACCEPTED"
          : status === "REJECTED"
            ? "suppliers.manifestDetail.status.REJECTED"
            : "suppliers.manifestDetail.status.COMPLETED";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {t(label)}
    </span>
  );
}

function StatusStepper({ status }: { status: ReturnManifestStatus }) {
  const { t } = useLocale();
  const steps: Array<{
    key: "PREPARED" | "DISPATCHED" | "ACCEPTED" | "COMPLETED";
    label: string;
  }> = [
    { key: "PREPARED", label: t("suppliers.manifestDetail.step.prepared") },
    { key: "DISPATCHED", label: t("suppliers.manifestDetail.step.dispatched") },
    {
      key: "ACCEPTED",
      label:
        status === "REJECTED"
          ? t("suppliers.manifestDetail.step.rejected")
          : t("suppliers.manifestDetail.step.decision"),
    },
    { key: "COMPLETED", label: t("suppliers.manifestDetail.step.completed") },
  ];

  const order: Record<ReturnManifestStatus, number> = {
    PREPARED: 0,
    DISPATCHED: 1,
    ACCEPTED: 2,
    REJECTED: 2,
    COMPLETED: 3,
  };
  const current = order[status];

  return (
    <ol className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs sm:text-sm">
      {steps.map((step, index) => {
        const done = index < current || (status === "COMPLETED" && index <= current);
        const active = index === current;
        const rejectedStep = status === "REJECTED" && step.key === "ACCEPTED";
        return (
          <li key={step.key} className="flex items-center gap-2">
            {index > 0 ? (
              <span className="text-muted" aria-hidden="true">
                →
              </span>
            ) : null}
            <span
              className={
                rejectedStep
                  ? "font-semibold text-red-700"
                  : done || active
                    ? "font-semibold text-foreground"
                    : "text-muted"
              }
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ActivityPanel({ manifest }: { manifest: ReturnManifestDetail }) {
  const { t } = useLocale();
  const activityRows: Array<{ label: string; at: string; by: string }> = [
    {
      label: t("suppliers.manifestDetail.activity.prepared"),
      at: formatDateTime(manifest.preparedAt),
      by: manifest.preparedBy.name,
    },
  ];
  if (manifest.dispatchedAt) {
    activityRows.push({
      label: t("suppliers.manifestDetail.activity.dispatched"),
      at: formatDateTime(manifest.dispatchedAt),
      by: manifest.dispatchedBy?.name ?? "—",
    });
  }
  if (manifest.decidedAt) {
    activityRows.push({
      label:
        manifest.status === "REJECTED"
          ? t("suppliers.manifestDetail.activity.rejected")
          : t("suppliers.manifestDetail.activity.accepted"),
      at: formatDateTime(manifest.decidedAt),
      by: manifest.decidedBy?.name ?? "—",
    });
  }
  if (manifest.completedAt) {
    activityRows.push({
      label: t("suppliers.manifestDetail.activity.completed"),
      at: formatDateTime(manifest.completedAt),
      by: manifest.completedBy?.name ?? "—",
    });
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          {t("suppliers.manifestDetail.activity.title")}
        </h2>
      </div>
      <ul className="divide-y divide-border">
        {activityRows.map((row) => (
          <li
            key={`${row.label}-${row.at}`}
            className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3 text-sm"
          >
            <div>
              <p className="font-medium text-foreground">{row.label}</p>
              <p className="text-xs text-muted">{row.by}</p>
            </div>
            <p className="text-xs text-muted">{row.at}</p>
          </li>
        ))}
      </ul>
      {manifest.dispatchReference || manifest.dispatchNotes || manifest.decisionNotes ? (
        <div className="space-y-2 border-t border-border px-5 py-3 text-sm">
          {manifest.dispatchReference ? (
            <p>
              <span className="text-muted">
                {t("suppliers.manifestDetail.dispatchReference")}:{" "}
              </span>
              {manifest.dispatchReference}
            </p>
          ) : null}
          {manifest.dispatchNotes ? (
            <p>
              <span className="text-muted">
                {t("suppliers.manifestDetail.dispatchNotes")}:{" "}
              </span>
              {manifest.dispatchNotes}
            </p>
          ) : null}
          {manifest.decisionNotes ? (
            <p>
              <span className="text-muted">
                {t("suppliers.manifestDetail.decisionNotes")}:{" "}
              </span>
              {manifest.decisionNotes}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        <span className="text-muted">{icon}</span>
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </article>
  );
}

function ModalShell({
  titleId,
  title,
  subtitle,
  onCancel,
  submitting,
  children,
  footer,
}: {
  titleId: string;
  title: string;
  subtitle: string;
  onCancel: () => void;
  submitting: boolean;
  children: ReactNode;
  footer: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={onCancel}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[92vh] w-full max-w-[640px] overflow-y-auto rounded-xl border border-border bg-surface shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            <p className="mt-1 text-xs text-muted">{subtitle}</p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-muted hover:bg-canvas hover:text-foreground"
            onClick={onCancel}
            disabled={submitting}
            aria-label={t("suppliers.manifestDetail.modalClose")}
          >
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </header>
        <div className="space-y-4 px-5 py-4">{children}</div>
        <footer className="flex flex-col-reverse gap-3 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
          {footer}
        </footer>
      </section>
    </div>
  );
}

function ModalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DispatchModal({
  manifest,
  onCancel,
  onDispatched,
}: {
  manifest: ReturnManifestDetail;
  onCancel: () => void;
  onDispatched: (next: ReturnManifestDetail) => void;
}) {
  const { t } = useLocale();
  const [dispatchReference, setDispatchReference] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationId] = useState(() => newOperationId());

  const units = manifest.lines.reduce((sum, line) => sum + line.returnQty, 0);
  const cost = roundMoney(
    manifest.lines.reduce(
      (sum, line) => sum + line.returnQty * line.costPerBase,
      0,
    ),
  );

  async function submit() {
    if (!confirmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const next = await dispatchReturnManifest(manifest.id, {
        operationId,
        dispatchReference,
        dispatchNotes,
      });
      onDispatched(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("suppliers.manifestDetail.dispatchError"),
      );
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      titleId="manifest-dispatch-title"
      title={t("suppliers.manifestDetail.dispatchTitle")}
      subtitle={t("suppliers.manifestDetail.dispatchSubtitle")}
      onCancel={onCancel}
      submitting={submitting}
      footer={
        <>
          <button
            type="button"
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-canvas"
            onClick={onCancel}
            disabled={submitting}
          >
            {t("suppliers.manifestDetail.cancel")}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={submit}
            disabled={!confirmed || submitting}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <Truck className="size-4" strokeWidth={1.75} />
            )}
            {submitting
              ? t("suppliers.manifestDetail.dispatching")
              : t("suppliers.manifestDetail.confirmDispatch")}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <ModalMetric
          label={t("suppliers.manifestDetail.manifest")}
          value={manifest.srmNumber}
        />
        <ModalMetric
          label={t("suppliers.manifestDetail.supplier")}
          value={manifest.supplier.name}
        />
        <ModalMetric
          label={t("suppliers.manifestDetail.kpi.units")}
          value={`${formatCount(units)} ${t("suppliers.returns.pcs")}`}
        />
        <ModalMetric
          label={t("suppliers.manifestDetail.kpi.cost")}
          value={formatTaka(cost)}
        />
      </div>

      <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
        <span>{t("suppliers.manifestDetail.dispatchStockWarning")}</span>
      </div>

      <label className="block text-xs font-medium text-muted">
        {t("suppliers.manifestDetail.dispatchReference")}
        <input
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          value={dispatchReference}
          onChange={(event) => setDispatchReference(event.target.value)}
          placeholder={t("suppliers.manifestDetail.dispatchReferencePlaceholder")}
          maxLength={160}
          disabled={submitting}
        />
      </label>

      <label className="block text-xs font-medium text-muted">
        {t("suppliers.manifestDetail.dispatchNotes")}
        <textarea
          className="mt-1 min-h-[88px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          value={dispatchNotes}
          onChange={(event) => setDispatchNotes(event.target.value)}
          placeholder={t("suppliers.manifestDetail.dispatchNotesPlaceholder")}
          maxLength={1000}
          disabled={submitting}
        />
      </label>

      <label className="flex items-start gap-2 rounded-lg border border-border bg-canvas p-3 text-xs text-foreground">
        <input
          type="checkbox"
          className="mt-0.5 size-4 rounded border-border text-primary"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          disabled={submitting}
        />
        <span>{t("suppliers.manifestDetail.dispatchConfirm")}</span>
      </label>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </ModalShell>
  );
}

function DecisionModal({
  manifest,
  onCancel,
  onDecided,
}: {
  manifest: ReturnManifestDetail;
  onCancel: () => void;
  onDecided: (next: ReturnManifestDetail) => void;
}) {
  const { t } = useLocale();
  const [decision, setDecision] = useState<ReturnSupplierDecision | "">("");
  const [supplierReference, setSupplierReference] = useState(
    manifest.supplierReference ?? "",
  );
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!decision || !confirmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const next = await decideReturnManifest(manifest.id, {
        decision,
        supplierReference,
        notes,
      });
      onDecided(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("suppliers.manifestDetail.decisionError"),
      );
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      titleId="manifest-decision-title"
      title={t("suppliers.manifestDetail.decisionTitle")}
      subtitle={t("suppliers.manifestDetail.decisionSubtitle")}
      onCancel={onCancel}
      submitting={submitting}
      footer={
        <>
          <button
            type="button"
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-canvas"
            onClick={onCancel}
            disabled={submitting}
          >
            {t("suppliers.manifestDetail.cancel")}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={submit}
            disabled={!decision || !confirmed || submitting}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <Check className="size-4" strokeWidth={1.75} />
            )}
            {submitting
              ? t("suppliers.manifestDetail.deciding")
              : t("suppliers.manifestDetail.confirmDecision")}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-2">
        <ModalMetric
          label={t("suppliers.manifestDetail.manifest")}
          value={manifest.srmNumber}
        />
        <ModalMetric
          label={t("suppliers.manifestDetail.supplier")}
          value={manifest.supplier.name}
        />
      </div>

      <label className="block text-xs font-medium text-muted">
        {t("suppliers.manifestDetail.decisionField")}
        <select
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          value={decision}
          onChange={(event) =>
            setDecision(event.target.value as ReturnSupplierDecision | "")
          }
          disabled={submitting}
        >
          <option value="">{t("suppliers.manifestDetail.decisionSelect")}</option>
          <option value="ACCEPTED">
            {t("suppliers.manifestDetail.decisionAccepted")}
          </option>
          <option value="REJECTED">
            {t("suppliers.manifestDetail.decisionRejected")}
          </option>
        </select>
      </label>

      <label className="block text-xs font-medium text-muted">
        {t("suppliers.manifestDetail.creditReference")}
        <input
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          value={supplierReference}
          onChange={(event) => setSupplierReference(event.target.value)}
          placeholder={t("suppliers.manifestDetail.creditReferencePlaceholder")}
          maxLength={160}
          disabled={submitting}
        />
        {decision === "ACCEPTED" ? (
          <span className="mt-1 block text-[11px] text-muted">
            {t("suppliers.manifestDetail.creditReferenceHint")}
          </span>
        ) : null}
      </label>

      <label className="block text-xs font-medium text-muted">
        {t("suppliers.manifestDetail.decisionNotes")}
        <textarea
          className="mt-1 min-h-[88px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t("suppliers.manifestDetail.decisionNotesPlaceholder")}
          maxLength={1000}
          disabled={submitting}
        />
      </label>

      {decision === "REJECTED" ? (
        <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          <span>{t("suppliers.manifestDetail.rejectNoRestore")}</span>
        </div>
      ) : null}

      <label className="flex items-start gap-2 rounded-lg border border-border bg-canvas p-3 text-xs text-foreground">
        <input
          type="checkbox"
          className="mt-0.5 size-4 rounded border-border text-primary"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          disabled={submitting}
        />
        <span>{t("suppliers.manifestDetail.decisionConfirm")}</span>
      </label>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </ModalShell>
  );
}

function CompleteModal({
  manifest,
  onCancel,
  onCompleted,
}: {
  manifest: ReturnManifestDetail;
  onCancel: () => void;
  onCompleted: (next: ReturnManifestDetail) => void;
}) {
  const { t } = useLocale();
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const units = manifest.lines.reduce((sum, line) => sum + line.returnQty, 0);
  const cost = roundMoney(
    manifest.lines.reduce(
      (sum, line) => sum + line.returnQty * line.costPerBase,
      0,
    ),
  );

  async function submit() {
    if (!confirmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const next = await completeReturnManifest(manifest.id);
      onCompleted(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("suppliers.manifestDetail.completeError"),
      );
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      titleId="manifest-complete-title"
      title={t("suppliers.manifestDetail.completeTitle")}
      subtitle={t("suppliers.manifestDetail.completeSubtitle")}
      onCancel={onCancel}
      submitting={submitting}
      footer={
        <>
          <button
            type="button"
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-canvas"
            onClick={onCancel}
            disabled={submitting}
          >
            {t("suppliers.manifestDetail.cancel")}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={submit}
            disabled={!confirmed || submitting}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <Check className="size-4" strokeWidth={1.75} />
            )}
            {submitting
              ? t("suppliers.manifestDetail.completing")
              : t("suppliers.manifestDetail.confirmComplete")}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <ModalMetric
          label={t("suppliers.manifestDetail.manifest")}
          value={manifest.srmNumber}
        />
        <ModalMetric
          label={t("suppliers.manifestDetail.supplier")}
          value={manifest.supplier.name}
        />
        <ModalMetric
          label={t("suppliers.manifestDetail.kpi.units")}
          value={`${formatCount(units)} ${t("suppliers.returns.pcs")}`}
        />
        <ModalMetric
          label={t("suppliers.manifestDetail.kpi.cost")}
          value={formatTaka(cost)}
        />
      </div>

      <p className="text-sm text-muted">
        {t("suppliers.manifestDetail.completeBody")}
      </p>

      <label className="flex items-start gap-2 rounded-lg border border-border bg-canvas p-3 text-xs text-foreground">
        <input
          type="checkbox"
          className="mt-0.5 size-4 rounded border-border text-primary"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          disabled={submitting}
        />
        <span>{t("suppliers.manifestDetail.completeConfirm")}</span>
      </label>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </ModalShell>
  );
}
