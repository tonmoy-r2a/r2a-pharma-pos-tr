import { ArrowLeft, Bell, KeyRound, Loader2, Lock, Monitor, Save, Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/i18n";
import { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useOwnerPath } from "@/lib/OwnerPathProvider";
import {
  changeOwnerPassword,
  fetchAccountSettings,
  patchAccountSettings,
  type AccountSettings,
} from "@/lib/settings";

type ProfileForm = {
  name: string;
  phone: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

/**
 * Invented Account Profile (Batch BO) — live account GET/PATCH + change-password.
 * 2FA / sessions / notification toggles stay disabled with hints.
 */
export function AccountProfilePage() {
  const { t } = useLocale();
  const { navigate } = useOwnerPath();
  const [data, setData] = useState<AccountSettings | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void fetchAccountSettings()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setForm({ name: result.name, phone: result.phone ?? "" });
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoading(false);
        setLoadError(
          err instanceof ApiError ? err.message : t("settings.account.loadError"),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [reload, t]);

  const dirty = useMemo(() => {
    if (!data || !form) return false;
    return (
      form.name.trim() !== data.name ||
      form.phone.trim() !== (data.phone ?? "")
    );
  }, [data, form]);

  async function onSaveProfile() {
    if (!form || saving) return;
    if (!form.name.trim()) {
      setSaveError(t("settings.account.nameRequired"));
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = await patchAccountSettings({
        name: form.name.trim(),
        phone: form.phone.trim() ? form.phone.trim() : null,
      });
      setData(updated);
      setForm({ name: updated.name, phone: updated.phone ?? "" });
      setSaveSuccess(true);
    } catch (err: unknown) {
      setSaveError(
        err instanceof ApiError ? err.message : t("settings.account.saveError"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword() {
    if (passwordSaving) return;
    setPasswordError(null);
    setPasswordSuccess(false);
    if (!passwordForm.currentPassword) {
      setPasswordError(t("settings.account.password.currentRequired"));
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError(t("settings.account.password.newMin"));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t("settings.account.password.mismatch"));
      return;
    }
    setPasswordSaving(true);
    try {
      await changeOwnerPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordSuccess(true);
      setReload((n) => n + 1);
    } catch (err: unknown) {
      setPasswordError(
        err instanceof ApiError
          ? err.message
          : t("settings.account.password.error"),
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="w-full px-5 py-4">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            {t("settings.account.breadcrumb")}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-canvas"
            >
              <ArrowLeft className="size-3.5" strokeWidth={1.75} />
              {t("settings.account.back")}
            </button>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("settings.account.title")}
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted">{t("settings.account.subtitle")}</p>
        </div>
        <button
          type="button"
          disabled={!dirty || saving || !form}
          onClick={() => void onSaveProfile()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
          ) : (
            <Save className="size-4" strokeWidth={1.75} />
          )}
          {saving ? t("settings.account.saving") : t("settings.account.save")}
        </button>
      </div>

      {loading && !data ? (
        <p className="text-sm text-muted">{t("settings.account.loading")}</p>
      ) : null}

      {loadError && !data ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          <p className="text-destructive">{loadError}</p>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1 text-foreground hover:bg-canvas"
            onClick={() => setReload((n) => n + 1)}
          >
            {t("settings.account.retry")}
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
          {t("settings.account.saveSuccess")}
        </div>
      ) : null}

      {form && data ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-foreground">
                {t("settings.account.section.personal")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("settings.account.fields.name")}
                  value={form.name}
                  onChange={(v) => {
                    setForm((prev) => (prev ? { ...prev, name: v } : prev));
                    setSaveSuccess(false);
                  }}
                  required
                />
                <Field
                  label={t("settings.account.fields.email")}
                  value={data.email}
                  readOnly
                  hint={t("settings.account.fields.emailHint")}
                />
                <Field
                  label={t("settings.account.fields.phone")}
                  value={form.phone}
                  onChange={(v) => {
                    setForm((prev) => (prev ? { ...prev, phone: v } : prev));
                    setSaveSuccess(false);
                  }}
                />
                <Field
                  label={t("settings.account.fields.role")}
                  value={data.role}
                  readOnly
                />
                <Field
                  label={t("settings.account.fields.lastLogin")}
                  value={
                    data.lastLoginAt
                      ? formatDateTime(data.lastLoginAt)
                      : t("settings.account.fields.lastLoginNever")
                  }
                  readOnly
                />
                <Field
                  label={t("settings.account.fields.memberSince")}
                  value={formatDateTime(data.createdAt)}
                  readOnly
                />
              </div>
            </section>

            <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <KeyRound className="size-4 text-primary" strokeWidth={1.75} />
                <h2 className="text-base font-semibold text-foreground">
                  {t("settings.account.section.password")}
                </h2>
              </div>
              {passwordError ? (
                <div
                  role="alert"
                  className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {passwordError}
                </div>
              ) : null}
              {passwordSuccess ? (
                <div
                  role="status"
                  className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                >
                  {t("settings.account.password.success")}
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("settings.account.password.current")}
                  value={passwordForm.currentPassword}
                  onChange={(v) =>
                    setPasswordForm((prev) => ({ ...prev, currentPassword: v }))
                  }
                  type="password"
                />
                <div className="hidden sm:block" />
                <Field
                  label={t("settings.account.password.new")}
                  value={passwordForm.newPassword}
                  onChange={(v) =>
                    setPasswordForm((prev) => ({ ...prev, newPassword: v }))
                  }
                  type="password"
                  hint={t("settings.account.password.newHint")}
                />
                <Field
                  label={t("settings.account.password.confirm")}
                  value={passwordForm.confirmPassword}
                  onChange={(v) =>
                    setPasswordForm((prev) => ({ ...prev, confirmPassword: v }))
                  }
                  type="password"
                />
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  disabled={passwordSaving}
                  onClick={() => void onChangePassword()}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-canvas disabled:opacity-50"
                >
                  {passwordSaving ? (
                    <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <Lock className="size-4" strokeWidth={1.75} />
                  )}
                  {passwordSaving
                    ? t("settings.account.password.submitting")
                    : t("settings.account.password.submit")}
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-foreground">
                {t("settings.account.section.security")}
              </h2>
              <div className="space-y-3">
                <DisabledToggle
                  icon={Shield}
                  title={t("settings.account.disabled.twoFactor.title")}
                  body={t("settings.account.disabled.twoFactor.body")}
                  hint={t("settings.account.disabled.twoFactor.hint")}
                />
                <DisabledToggle
                  icon={Monitor}
                  title={t("settings.account.disabled.sessions.title")}
                  body={t("settings.account.disabled.sessions.body")}
                  hint={t("settings.account.disabled.sessions.hint")}
                />
                <DisabledToggle
                  icon={Bell}
                  title={t("settings.account.disabled.notifications.title")}
                  body={t("settings.account.disabled.notifications.body")}
                  hint={t("settings.account.disabled.notifications.hint")}
                />
              </div>
            </section>
          </div>

          <aside className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">
              {t("settings.account.activity.title")}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {t("settings.account.activity.subtitle")}
            </p>
            {data.recentActivity.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                {t("settings.account.activity.empty")}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.recentActivity.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/70" />
                    <span className="min-w-0">
                      <span className="block text-xs text-muted">
                        {formatDateTime(item.createdAt)}
                      </span>
                      <span className="block text-sm font-medium text-foreground">
                        {item.summary}
                      </span>
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
  hint,
  type = "text",
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  required?: boolean;
  hint?: string;
  type?: "text" | "password";
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-muted"
      />
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

function DisabledToggle({
  icon: Icon,
  title,
  body,
  hint,
}: {
  icon: typeof Shield;
  title: string;
  body: string;
  hint: string;
}) {
  return (
    <div
      title={hint}
      className="flex items-start gap-3 rounded-lg border border-border/80 bg-slate-50/80 px-3 py-3 opacity-80"
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-muted">
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted">{body}</p>
        <p className="mt-1 text-xs text-muted">{hint}</p>
      </div>
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="relative h-5 w-9 shrink-0 cursor-not-allowed rounded-full bg-slate-300"
      >
        <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow" />
      </button>
    </div>
  );
}
