import { ArrowLeft, Building2, Loader2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/i18n";
import { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useOwnerPath } from "@/lib/OwnerPathProvider";
import {
  fetchBusinessSettings,
  patchBusinessSettings,
  type BusinessSettings,
} from "@/lib/settings";

type FormState = {
  name: string;
  legalName: string;
  tradeLicenseNo: string;
  drugLicenseNo: string;
  vatRegNo: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  website: string;
  openingHours: string;
  timezone: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeOpeningHours: string;
};

function toForm(data: BusinessSettings): FormState {
  const { tenant, store } = data;
  return {
    name: tenant.name,
    legalName: tenant.legalName ?? "",
    tradeLicenseNo: tenant.tradeLicenseNo ?? "",
    drugLicenseNo: tenant.drugLicenseNo ?? "",
    vatRegNo: tenant.vatRegNo ?? "",
    contactEmail: tenant.contactEmail ?? "",
    contactPhone: tenant.contactPhone ?? "",
    address: tenant.address ?? "",
    website: tenant.website ?? "",
    openingHours: tenant.openingHours ?? "",
    timezone: tenant.timezone || "Asia/Dhaka",
    storeName: store?.name ?? "",
    storeAddress: store?.address ?? "",
    storePhone: store?.contactPhone ?? "",
    storeOpeningHours: store?.openingHours ?? "",
  };
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Invented Business Profile (Batch BN) — live GET/PATCH + configuration timeline.
 * Currency stays BDT read-only. Domain values are not translated.
 */
export function BusinessProfilePage() {
  const { t } = useLocale();
  const { navigate } = useOwnerPath();
  const [data, setData] = useState<BusinessSettings | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void fetchBusinessSettings()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setForm(toForm(result));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoading(false);
        setLoadError(
          err instanceof ApiError ? err.message : t("settings.business.loadError"),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [reload, t]);

  const dirty = useMemo(() => {
    if (!data || !form) return false;
    const baseline = toForm(data);
    return (Object.keys(baseline) as Array<keyof FormState>).some(
      (key) => form[key] !== baseline[key],
    );
  }, [data, form]);

  async function onSave() {
    if (!form || saving) return;
    if (!form.name.trim()) {
      setSaveError(t("settings.business.nameRequired"));
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = await patchBusinessSettings({
        name: form.name.trim(),
        legalName: emptyToNull(form.legalName),
        tradeLicenseNo: emptyToNull(form.tradeLicenseNo),
        drugLicenseNo: emptyToNull(form.drugLicenseNo),
        vatRegNo: emptyToNull(form.vatRegNo),
        contactEmail: emptyToNull(form.contactEmail) ?? "",
        contactPhone: emptyToNull(form.contactPhone),
        address: emptyToNull(form.address),
        website: emptyToNull(form.website),
        openingHours: emptyToNull(form.openingHours),
        timezone: form.timezone.trim() || "Asia/Dhaka",
        storeName: form.storeName.trim() || undefined,
        storeAddress: emptyToNull(form.storeAddress),
        storePhone: emptyToNull(form.storePhone),
        storeOpeningHours: emptyToNull(form.storeOpeningHours),
      });
      setData(updated);
      setForm(toForm(updated));
      setSaveSuccess(true);
    } catch (err: unknown) {
      setSaveError(
        err instanceof ApiError ? err.message : t("settings.business.saveError"),
      );
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaveSuccess(false);
  }

  return (
    <div className="w-full px-5 py-4">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            {t("settings.business.breadcrumb")}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-canvas"
            >
              <ArrowLeft className="size-3.5" strokeWidth={1.75} />
              {t("settings.business.back")}
            </button>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("settings.business.title")}
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted">{t("settings.business.subtitle")}</p>
        </div>
        <button
          type="button"
          disabled={!dirty || saving || !form}
          onClick={() => void onSave()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
          ) : (
            <Save className="size-4" strokeWidth={1.75} />
          )}
          {saving ? t("settings.business.saving") : t("settings.business.save")}
        </button>
      </div>

      {loading && !data ? (
        <p className="text-sm text-muted">{t("settings.business.loading")}</p>
      ) : null}

      {loadError && !data ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          <p className="text-destructive">{loadError}</p>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1 text-foreground hover:bg-canvas"
            onClick={() => setReload((n) => n + 1)}
          >
            {t("settings.business.retry")}
          </button>
        </div>
      ) : null}

      {saveError ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {saveError}
        </div>
      ) : null}

      {saveSuccess ? (
        <div
          role="status"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {t("settings.business.saveSuccess")}
        </div>
      ) : null}

      {form && data ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Building2 className="size-4 text-primary" strokeWidth={1.75} />
                <h2 className="text-base font-semibold text-foreground">
                  {t("settings.business.section.pharmacy")}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("settings.business.fields.name")}
                  value={form.name}
                  onChange={(v) => updateField("name", v)}
                  required
                />
                <Field
                  label={t("settings.business.fields.legalName")}
                  value={form.legalName}
                  onChange={(v) => updateField("legalName", v)}
                />
                <Field
                  label={t("settings.business.fields.tradeLicense")}
                  value={form.tradeLicenseNo}
                  onChange={(v) => updateField("tradeLicenseNo", v)}
                />
                <Field
                  label={t("settings.business.fields.drugLicense")}
                  value={form.drugLicenseNo}
                  onChange={(v) => updateField("drugLicenseNo", v)}
                />
                <Field
                  label={t("settings.business.fields.vatReg")}
                  value={form.vatRegNo}
                  onChange={(v) => updateField("vatRegNo", v)}
                />
                <Field
                  label={t("settings.business.fields.currency")}
                  value={data.tenant.currency || "BDT"}
                  readOnly
                  hint={t("settings.business.fields.currencyHint")}
                />
                <Field
                  label={t("settings.business.fields.timezone")}
                  value={form.timezone}
                  onChange={(v) => updateField("timezone", v)}
                />
                <Field
                  label={t("settings.business.fields.website")}
                  value={form.website}
                  onChange={(v) => updateField("website", v)}
                />
                <Field
                  label={t("settings.business.fields.email")}
                  value={form.contactEmail}
                  onChange={(v) => updateField("contactEmail", v)}
                />
                <Field
                  label={t("settings.business.fields.phone")}
                  value={form.contactPhone}
                  onChange={(v) => updateField("contactPhone", v)}
                />
                <div className="sm:col-span-2">
                  <Field
                    label={t("settings.business.fields.address")}
                    value={form.address}
                    onChange={(v) => updateField("address", v)}
                    multiline
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field
                    label={t("settings.business.fields.openingHours")}
                    value={form.openingHours}
                    onChange={(v) => updateField("openingHours", v)}
                    placeholder={t("settings.business.fields.openingHoursPlaceholder")}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-foreground">
                {t("settings.business.section.store")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("settings.business.fields.storeName")}
                  value={form.storeName}
                  onChange={(v) => updateField("storeName", v)}
                />
                <Field
                  label={t("settings.business.fields.storePhone")}
                  value={form.storePhone}
                  onChange={(v) => updateField("storePhone", v)}
                />
                <div className="sm:col-span-2">
                  <Field
                    label={t("settings.business.fields.storeAddress")}
                    value={form.storeAddress}
                    onChange={(v) => updateField("storeAddress", v)}
                    multiline
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field
                    label={t("settings.business.fields.storeHours")}
                    value={form.storeOpeningHours}
                    onChange={(v) => updateField("storeOpeningHours", v)}
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">
              {t("settings.business.timeline.title")}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {t("settings.business.timeline.subtitle")}
            </p>
            {data.timeline.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                {t("settings.business.timeline.empty")}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.timeline.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/70" />
                    <span className="min-w-0">
                      <span className="block text-xs text-muted">
                        {formatDateTime(item.createdAt)}
                      </span>
                      <span className="block text-sm font-medium text-foreground">
                        {item.summary}
                      </span>
                      {item.actorName ? (
                        <span className="block text-xs text-muted">{item.actorName}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly,
  required,
  multiline,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  required?: boolean;
  multiline?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  const className =
    "mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-muted";

  return (
    <label className="block text-sm">
      <span className="font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          readOnly={readOnly}
          disabled={readOnly}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          className={className}
        />
      ) : (
        <input
          type="text"
          value={value}
          readOnly={readOnly}
          disabled={readOnly}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          className={className}
        />
      )}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
