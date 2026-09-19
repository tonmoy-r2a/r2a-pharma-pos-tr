import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  MapPin,
  Package,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Store as StoreIcon,
  Tag,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, type MessageKey } from "@/i18n";
import { ApiError } from "@/lib/api";
import {
  correctFefoViolation,
  fetchAuditDetail,
  reviewAudit,
  type AuditActivity,
  type AuditDetail,
  type AuditDetailLine,
  type FefoViolationDetail,
  type StockAuditActivityType,
  type StockAuditStatus,
} from "@/lib/audit";
import { csvStamp, downloadCsv } from "@/lib/csvExport";
import { formatCount, formatDateTime, formatTaka, formatUtcDate } from "@/lib/format";
import { useOwnerPath } from "@/lib/OwnerPathProvider";

const STATUS_KEYS: Record<StockAuditStatus, MessageKey> = {
  IN_PROGRESS: "audit.status.inProgress",
  UNDER_REVIEW: "audit.status.underReview",
  COMPLETED: "audit.status.completed",
  VARIANCE_FOUND: "audit.status.varianceFound",
};

const ACTIVITY_TYPE_KEYS: Record<StockAuditActivityType, MessageKey> = {
  CREATED: "audit.activity.created",
  COUNT_STARTED: "audit.activity.countStarted",
  VARIANCE_DETECTED: "audit.activity.varianceDetected",
  REVIEWED: "audit.activity.reviewed",
  FEFO_CORRECTED: "audit.activity.fefoCorrected",
  COMPLETED: "audit.activity.completed",
};

export function AuditDetailPage({ auditId }: { auditId: string }) {
  const { t } = useLocale();
  const { navigate } = useOwnerPath();

  const [audit, setAudit] = useState<AuditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // FEFO correction modal state
  const [selectedViolation, setSelectedViolation] = useState<FefoViolationDetail | null>(null);

  // Toast / feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchAuditDetail(auditId)
      .then((payload) => {
        if (cancelled) return;
        setAudit(payload);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAudit(null);
        setLoading(false);
        if (err instanceof ApiError && err.statusCode === 404) {
          setError(t("audit.detail.notFound"));
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError(t("audit.detail.error"));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [auditId, reload, t]);

  const handleReviewSuccess = useCallback((updated: AuditDetail, msgKey: MessageKey) => {
    setAudit(updated);
    setReviewModalOpen(false);
    setToastMessage(t(msgKey));
    setTimeout(() => setToastMessage(null), 4000);
  }, [t]);

  const handleCorrectionSuccess = useCallback((corrected: FefoViolationDetail) => {
    setAudit((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        fefoViolations: prev.fefoViolations.map((v) => (v.id === corrected.id ? corrected : v)),
      };
    });
    setSelectedViolation(null);
    setToastMessage(t("audit.correctModal.success"));
    setTimeout(() => setToastMessage(null), 4000);
  }, [t]);

  function exportLinesCsv() {
    if (!audit || audit.lines.length === 0) return;
    const headers = [
      t("audit.detail.lines.medicine"),
      t("audit.detail.lines.batch"),
      t("audit.detail.lines.expiry"),
      t("audit.detail.lines.systemQty"),
      t("audit.detail.lines.countedQty"),
      t("audit.detail.lines.difference"),
      t("audit.detail.lines.unitCost"),
      t("audit.detail.lines.variance"),
      t("audit.detail.lines.status"),
    ];
    const rows = audit.lines.map((line) => [
      line.productNameSnapshot,
      line.batchNumberSnapshot,
      formatUtcDate(line.expiryDateSnapshot),
      String(line.systemQty),
      String(line.countedQty),
      String(line.differenceQty),
      String(line.costPerBaseSnapshot),
      String(line.differenceQty * line.costPerBaseSnapshot),
      line.status === "MATCHES"
        ? t("audit.detail.lines.matches")
        : t("audit.detail.lines.discrepancy"),
    ]);
    const safeNo = audit.auditNo.replace(/[^\w.-]+/g, "-");
    downloadCsv(`audit-lines-${safeNo}-${csvStamp()}.csv`, [headers, ...rows]);
  }

  return (
    <div className="w-full px-5 py-4">
      {/* Breadcrumb Navigation */}
      <nav aria-label={t("audit.detail.breadcrumb")} className="mb-3 flex items-center gap-1.5 text-sm text-muted">
        <button
          type="button"
          className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
          onClick={() => navigate("/audit")}
        >
          <ArrowLeft className="size-3.5" />
          {t("audit.breadcrumb")}
        </button>
        <span>›</span>
        <span className="font-medium text-foreground">{audit?.auditNo ?? t("audit.detail.breadcrumb")}</span>
      </nav>

      {/* Toast Notification */}
      {toastMessage ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm text-teal-800 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="size-4 shrink-0 text-teal-600" />
          <span>{toastMessage}</span>
        </div>
      ) : null}

      {/* Loading state */}
      {loading && !audit ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-surface p-8">
          <p className="text-sm text-muted">{t("audit.detail.loading")}</p>
        </div>
      ) : null}

      {/* Error state */}
      {error && !audit ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <p>{error}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-border bg-surface px-3 py-1.5 font-medium text-foreground hover:bg-canvas"
              onClick={() => setReload((n) => n + 1)}
            >
              {t("audit.detail.retry")}
            </button>
            <button
              type="button"
              className="rounded-md border border-border bg-surface px-3 py-1.5 font-medium text-foreground hover:bg-canvas"
              onClick={() => navigate("/audit")}
            >
              {t("audit.detail.back")}
            </button>
          </div>
        </div>
      ) : null}

      {/* Audit Detail Content */}
      {audit ? (
        <div className="space-y-5">
          {/* Header section */}
          <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{audit.auditNo}</h1>
                <StatusBadge status={audit.status} />
              </div>
              <p className="flex flex-wrap items-center gap-3 text-sm text-muted">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {audit.locationLabel}
                </span>
                {audit.store?.name ? (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <StoreIcon className="size-3.5" />
                      {audit.store.name}
                    </span>
                  </>
                ) : null}
              </p>
            </div>

            {/* Header Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={audit.lines.length === 0}
                title={
                  audit.lines.length === 0
                    ? t("audit.detail.exportEmpty")
                    : t("audit.detail.generateHint")
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:text-muted disabled:opacity-60"
                onClick={exportLinesCsv}
              >
                <Download className="size-3.5" />
                {t("audit.detail.generateReport")}
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                title={t("audit.detail.printHint")}
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-border bg-canvas px-3.5 py-2 text-xs font-semibold text-muted opacity-60"
              >
                <Printer className="size-3.5" />
                {t("audit.detail.print")}
              </button>

              <button
                type="button"
                onClick={() => setReviewModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              >
                <FileCheck2 className="size-4" />
                {t("audit.detail.reviewButton")}
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-medium uppercase tracking-wider">{t("audit.detail.kpi.itemsChecked")}</span>
                <Package className="size-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {formatCount(audit.itemsChecked)} <span className="text-xs font-normal text-muted">{t("audit.items")}</span>
              </p>
              <p className="mt-1 text-xs text-muted">
                {formatCount(audit.lines.filter((l) => l.status === "MATCHES").length)} {t("audit.detail.kpi.matches")}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-medium uppercase tracking-wider">{t("audit.detail.kpi.discrepancies")}</span>
                <AlertTriangle className={`size-4 ${audit.lines.filter((l) => l.differenceQty !== 0).length > 0 ? "text-amber-500" : "text-teal-500"}`} />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {formatCount(audit.lines.filter((l) => l.differenceQty !== 0).length)} <span className="text-xs font-normal text-muted">{t("audit.items")}</span>
              </p>
              <p className="mt-1 text-xs text-muted">
                {audit.lines.filter((l) => l.differenceQty !== 0).length > 0 ? t("audit.detail.lines.discrepancy") : t("audit.detail.lines.matches")}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-medium uppercase tracking-wider">{t("audit.detail.kpi.varianceAmount")}</span>
                <Tag className="size-4 text-primary" />
              </div>
              <p className={`mt-2 text-2xl font-bold ${audit.varianceAmount > 0 ? "text-destructive" : "text-foreground"}`}>
                {formatTaka(audit.varianceAmount)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {audit.varianceAmount === 0 ? t("audit.detail.kpi.matches") : t("audit.detail.lines.discrepancy")}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-medium uppercase tracking-wider">{t("audit.detail.kpi.status")}</span>
                <Clock className="size-4 text-primary" />
              </div>
              <div className="mt-2">
                <StatusBadge status={audit.status} />
              </div>
              <p className="mt-2 text-xs text-muted truncate">
                {audit.reviewedBy?.name ? `${t("audit.detail.info.reviewedBy")}: ${audit.reviewedBy.name}` : t("audit.detail.info.notReviewed")}
              </p>
            </div>
          </div>

          {/* Audit Metadata & Notes Card */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider text-muted mb-3">
              {t("audit.detail.info.notes")} &amp; Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-xs text-muted block">{t("audit.detail.info.startedAt")}</span>
                <span className="font-medium text-foreground">{formatDateTime(audit.startedAt)}</span>
              </div>
              <div>
                <span className="text-xs text-muted block">{t("audit.detail.info.completedAt")}</span>
                <span className="font-medium text-foreground">{audit.completedAt ? formatDateTime(audit.completedAt) : "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted block">{t("audit.detail.info.createdBy")}</span>
                <span className="font-medium text-foreground">{audit.createdBy?.name ?? t("audit.system")}</span>
              </div>
              <div>
                <span className="text-xs text-muted block">{t("audit.detail.info.reviewedBy")}</span>
                <span className="font-medium text-foreground">
                  {audit.reviewedBy?.name ? `${audit.reviewedBy.name} (${audit.reviewedAt ? formatDateTime(audit.reviewedAt) : ""})` : t("audit.detail.info.notReviewed")}
                </span>
              </div>
            </div>
            {audit.notes ? (
              <div className="mt-4 rounded-lg bg-canvas p-3 border border-border text-sm text-foreground">
                <span className="text-xs font-semibold text-muted block mb-1">{t("audit.detail.info.notes")}:</span>
                <p className="whitespace-pre-wrap">{audit.notes}</p>
              </div>
            ) : null}
          </div>

          {/* Counted Stock Lines Table */}
          <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">{t("audit.detail.lines.title")}</h2>
              <p className="text-xs text-muted mt-0.5">{t("audit.detail.lines.subtitle")}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-canvas/60 text-xs font-semibold uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-4 py-3">{t("audit.detail.lines.medicine")}</th>
                    <th className="px-4 py-3">{t("audit.detail.lines.batch")}</th>
                    <th className="px-4 py-3">{t("audit.detail.lines.expiry")}</th>
                    <th className="px-4 py-3 text-right">{t("audit.detail.lines.systemQty")}</th>
                    <th className="px-4 py-3 text-right">{t("audit.detail.lines.countedQty")}</th>
                    <th className="px-4 py-3 text-right">{t("audit.detail.lines.difference")}</th>
                    <th className="px-4 py-3 text-right">{t("audit.detail.lines.unitCost")}</th>
                    <th className="px-4 py-3 text-right">{t("audit.detail.lines.variance")}</th>
                    <th className="px-4 py-3 text-center">{t("audit.detail.lines.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {audit.lines.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted">
                        {t("audit.detail.lines.empty")}
                      </td>
                    </tr>
                  ) : (
                    audit.lines.map((line) => (
                      <AuditLineRow key={line.id} line={line} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FEFO Violations Section */}
          <div className="rounded-xl border border-border bg-surface shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-5 text-amber-600" />
                  <h2 className="text-base font-semibold text-foreground">{t("audit.detail.fefo.title")}</h2>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {audit.fefoViolations.length}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">{t("audit.detail.fefo.subtitle")}</p>
              </div>
            </div>

            {audit.fefoViolations.length === 0 ? (
              <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-4 text-center">
                <ShieldCheck className="mx-auto size-6 text-teal-600 mb-1" />
                <p className="text-sm font-medium text-teal-900">{t("audit.detail.fefo.empty")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {audit.fefoViolations.map((violation) => (
                  <FefoViolationCard
                    key={violation.id}
                    violation={violation}
                    onApplyCorrection={() => setSelectedViolation(violation)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Activity Timeline Section */}
          <div className="rounded-xl border border-border bg-surface shadow-sm p-5">
            <h2 className="text-base font-semibold text-foreground mb-3">{t("audit.detail.activity.title")}</h2>
            {audit.activity.length === 0 ? (
              <p className="text-sm text-muted py-3">{t("audit.detail.activity.empty")}</p>
            ) : (
              <div className="space-y-3 mt-4">
                {audit.activity.map((event) => (
                  <ActivityTimelineItem key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Review Audit Modal */}
      {audit && reviewModalOpen ? (
        <ReviewAuditModal
          audit={audit}
          onClose={() => setReviewModalOpen(false)}
          onSuccess={(updated) => handleReviewSuccess(updated, "audit.reviewModal.success")}
        />
      ) : null}

      {/* FEFO Correction Modal */}
      {selectedViolation ? (
        <FefoCorrectionModal
          violation={selectedViolation}
          onClose={() => setSelectedViolation(null)}
          onSuccess={handleCorrectionSuccess}
        />
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: StockAuditStatus }) {
  const { t } = useLocale();
  const tone =
    status === "COMPLETED"
      ? "bg-teal-100 text-teal-700"
      : status === "VARIANCE_FOUND"
        ? "bg-red-100 text-red-700"
        : status === "UNDER_REVIEW"
          ? "bg-indigo-100 text-indigo-700"
          : "bg-amber-100 text-amber-700";
  return <span className={`rounded px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{t(STATUS_KEYS[status])}</span>;
}

function AuditLineRow({ line }: { line: AuditDetailLine }) {
  const { t } = useLocale();
  const varianceValue = Math.abs(line.differenceQty) * line.costPerBaseSnapshot;
  const isDiscrepancy = line.differenceQty !== 0;

  return (
    <tr className="hover:bg-canvas/40 transition-colors">
      <td className="px-4 py-3 font-medium text-foreground">
        <div>{line.productNameSnapshot}</div>
      </td>
      <td className="px-4 py-3 text-muted">{line.batchNumberSnapshot}</td>
      <td className="px-4 py-3 text-muted">{formatUtcDate(line.expiryDateSnapshot)}</td>
      <td className="px-4 py-3 text-right font-medium text-foreground">
        {formatCount(line.systemQty)} {t("audit.pcs")}
      </td>
      <td className="px-4 py-3 text-right font-semibold text-foreground">
        {formatCount(line.countedQty)} {t("audit.pcs")}
      </td>
      <td className={`px-4 py-3 text-right font-bold ${isDiscrepancy ? (line.differenceQty < 0 ? "text-destructive" : "text-blue-700") : "text-teal-700"}`}>
        {line.differenceQty === 0
          ? "0"
          : line.differenceQty > 0
            ? `+${formatCount(line.differenceQty)}`
            : formatCount(line.differenceQty)}
      </td>
      <td className="px-4 py-3 text-right text-muted">{formatTaka(line.costPerBaseSnapshot)}</td>
      <td className={`px-4 py-3 text-right font-medium ${varianceValue > 0 ? "text-destructive" : "text-foreground"}`}>
        {formatTaka(varianceValue)}
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${
            line.status === "MATCHES" ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700"
          }`}
        >
          {line.status === "MATCHES" ? t("audit.detail.lines.matches") : t("audit.detail.lines.discrepancy")}
        </span>
      </td>
    </tr>
  );
}

function FefoViolationCard({
  violation,
  onApplyCorrection,
}: {
  violation: FefoViolationDetail;
  onApplyCorrection: () => void;
}) {
  const { t } = useLocale();

  const statusBadge = (
    <span
      className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
        violation.status === "CORRECTED"
          ? "bg-teal-100 text-teal-700"
          : violation.status === "OPEN"
            ? "bg-amber-100 text-amber-700"
            : "bg-slate-100 text-slate-700"
      }`}
    >
      {violation.status === "OPEN"
        ? t("audit.detail.fefo.open")
        : violation.status === "CORRECTED"
          ? t("audit.detail.fefo.corrected")
          : t("audit.detail.fefo.dismissed")}
    </span>
  );

  return (
    <div className="rounded-lg border border-border bg-canvas/40 p-4 text-sm transition-all hover:border-border/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              {violation.product?.name ?? t("audit.detail.fefo.product")}
            </span>
            {violation.product?.sku ? (
              <span className="text-xs text-muted">({violation.product.sku})</span>
            ) : null}
            {statusBadge}
          </div>
          <p className="text-xs text-muted">{violation.observedIssue}</p>
        </div>

        {violation.status === "OPEN" ? (
          <button
            type="button"
            onClick={onApplyCorrection}
            className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <CheckCircle2 className="size-3.5" />
            {t("audit.detail.fefo.applyCorrection")}
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
        <div className="rounded border border-amber-200/80 bg-amber-50/50 p-2 text-amber-900">
          <span className="font-semibold text-amber-800 block mb-0.5">{t("audit.detail.fefo.skippedLot")}</span>
          <div>
            <span className="font-medium">{violation.skippedBatch?.batchNumber ?? "—"}</span>
            {violation.skippedBatch?.expiryDate ? (
              <span className="text-muted ml-2">({t("audit.expiry.expiry")}: {formatUtcDate(violation.skippedBatch.expiryDate)})</span>
            ) : null}
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-slate-50/60 p-2 text-slate-900">
          <span className="font-semibold text-slate-700 block mb-0.5">{t("audit.detail.fefo.pickedLot")}</span>
          <div>
            <span className="font-medium">{violation.pickedBatch?.batchNumber ?? "—"}</span>
            {violation.pickedBatch?.expiryDate ? (
              <span className="text-muted ml-2">({t("audit.expiry.expiry")}: {formatUtcDate(violation.pickedBatch.expiryDate)})</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-muted">
        <span className="font-medium text-foreground">{t("audit.detail.fefo.recommended")}: </span>
        {violation.recommendedAction}
      </div>

      {violation.status === "CORRECTED" && violation.correctionNote ? (
        <div className="mt-2.5 rounded bg-teal-50 border border-teal-200/70 p-2 text-xs text-teal-900">
          <span className="font-semibold text-teal-800">{t("audit.detail.fefo.correctionNote")}: </span>
          {violation.correctionNote}
          {violation.correctedAt ? (
            <span className="ml-2 text-teal-700/80 font-normal">
              ({formatDateTime(violation.correctedAt)})
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ActivityTimelineItem({ event }: { event: AuditActivity }) {
  const { t } = useLocale();
  const typeKey = ACTIVITY_TYPE_KEYS[event.type] ?? "audit.activity.fallback";

  return (
    <div className="relative border-l-2 border-border pl-4 pb-2">
      <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-primary" />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-foreground">{t(typeKey)}</span>
        <span className="text-[11px] text-muted">{formatDateTime(event.createdAt)}</span>
      </div>
      <div className="mt-1 rounded-md bg-canvas/70 border border-border/70 px-3 py-2 text-xs text-foreground">
        <p>{event.note || t("audit.activity.fallback")}</p>
        {event.actor?.name ? <p className="mt-1 text-[11px] text-muted">{event.actor.name}</p> : null}
      </div>
    </div>
  );
}

function ReviewAuditModal({
  audit,
  onClose,
  onSuccess,
}: {
  audit: AuditDetail;
  onClose: () => void;
  onSuccess: (updated: AuditDetail) => void;
}) {
  const { t } = useLocale();
  const [decision, setDecision] = useState<"COMPLETE" | "KEEP_VARIANCE">(
    audit.status === "VARIANCE_FOUND" ? "KEEP_VARIANCE" : "COMPLETE",
  );
  const [notes, setNotes] = useState(audit.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const updated = await reviewAudit(audit.id, {
        decision,
        notes: notes.trim() || undefined,
      });
      onSuccess(updated);
    } catch (err: unknown) {
      setSubmitting(false);
      if (err instanceof ApiError) setError(err.message);
      else setError(t("audit.detail.error"));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 id="review-modal-title" className="text-lg font-bold text-foreground">
              {t("audit.reviewModal.title")}
            </h2>
            <p className="text-xs text-muted mt-0.5">{t("audit.reviewModal.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-2">
              {t("audit.reviewModal.decision")}
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setDecision("COMPLETE")}
                className={`flex flex-col text-left p-3 rounded-lg border text-xs transition-all ${
                  decision === "COMPLETE"
                    ? "border-teal-600 bg-teal-50/50 ring-1 ring-teal-600 text-teal-950"
                    : "border-border bg-canvas hover:bg-canvas/80 text-foreground"
                }`}
              >
                <span className="font-bold flex items-center gap-1.5 text-teal-800">
                  <CheckCircle2 className="size-4" />
                  {t("audit.reviewModal.decisionComplete")}
                </span>
                <span className="mt-1 text-[11px] text-muted">
                  {t("audit.reviewModal.decisionCompleteDesc")}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDecision("KEEP_VARIANCE")}
                className={`flex flex-col text-left p-3 rounded-lg border text-xs transition-all ${
                  decision === "KEEP_VARIANCE"
                    ? "border-amber-600 bg-amber-50/50 ring-1 ring-amber-600 text-amber-950"
                    : "border-border bg-canvas hover:bg-canvas/80 text-foreground"
                }`}
              >
                <span className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="size-4" />
                  {t("audit.reviewModal.decisionVariance")}
                </span>
                <span className="mt-1 text-[11px] text-muted">
                  {t("audit.reviewModal.decisionVarianceDesc")}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="review-notes" className="text-xs font-semibold text-foreground block mb-1">
              {t("audit.reviewModal.notes")}
            </label>
            <textarea
              id="review-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("audit.reviewModal.notesPlaceholder")}
              className="w-full rounded-lg border border-border bg-canvas p-2.5 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-canvas"
            >
              {t("audit.reviewModal.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? t("audit.reviewModal.submitting") : t("audit.reviewModal.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FefoCorrectionModal({
  violation,
  onClose,
  onSuccess,
}: {
  violation: FefoViolationDetail;
  onClose: () => void;
  onSuccess: (corrected: FefoViolationDetail) => void;
}) {
  const { t } = useLocale();
  const [correctionNote, setCorrectionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!correctionNote.trim()) {
      setError(t("audit.correctModal.noteRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const corrected = await correctFefoViolation(violation.id, {
        correctionNote: correctionNote.trim(),
      });
      onSuccess(corrected);
    } catch (err: unknown) {
      setSubmitting(false);
      if (err instanceof ApiError) setError(err.message);
      else setError(t("audit.detail.error"));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fefo-modal-title"
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 id="fefo-modal-title" className="text-lg font-bold text-foreground">
              {t("audit.correctModal.title")}
            </h2>
            <p className="text-xs text-muted mt-0.5">{t("audit.correctModal.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs space-y-1">
          <div className="font-semibold text-amber-900">
            {violation.product?.name ?? t("audit.detail.fefo.product")}
          </div>
          <div className="text-amber-800">{violation.observedIssue}</div>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fefo-note" className="text-xs font-semibold text-foreground block mb-1">
              {t("audit.correctModal.noteLabel")} *
            </label>
            <textarea
              id="fefo-note"
              rows={3}
              required
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
              placeholder={t("audit.correctModal.notePlaceholder")}
              className="w-full rounded-lg border border-border bg-canvas p-2.5 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-canvas"
            >
              {t("audit.correctModal.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50"
            >
              {submitting ? t("audit.correctModal.submitting") : t("audit.correctModal.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
