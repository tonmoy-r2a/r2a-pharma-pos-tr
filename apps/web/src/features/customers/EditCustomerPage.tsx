import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  Save,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "@/i18n";
import { ApiError } from "@/lib/api";
import {
  checkCustomerPhone,
  fetchCustomerDetail,
  updateCustomer,
  type CustomerDetail,
  type CustomerGender,
  type CustomerStatus,
  type PhoneCheckCustomer,
} from "@/lib/customers";
import { useOwnerPath } from "@/lib/OwnerPathProvider";
import { useTenantChrome } from "@/lib/TenantContextProvider";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PHONE_LENGTH = 10;

type GenderOption = "" | CustomerGender;
type EditableStatus = "ACTIVE" | "INACTIVE";

type EditCustomerFormState = {
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: GenderOption;
  address: string;
  status: EditableStatus;
};

type FieldErrors = Partial<Record<"name" | "phone" | "email", string>>;

type PhoneCheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available" }
  | { status: "duplicate"; customer: PhoneCheckCustomer };

function toForm(profile: CustomerDetail["profile"]): EditCustomerFormState {
  return {
    name: profile.name,
    phone: profile.phone,
    email: profile.email ?? "",
    dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : "",
    gender: profile.gender ?? "",
    address: profile.address ?? "",
    status: profile.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  };
}

/**
 * Edit Customer (Prod Batch P1). Content region only — chrome is Batch B.
 * Live GET /owner/customers/:id + PATCH /customers/:id. Route: /customers/:id/edit.
 * Fields align with Add Customer + detail (name, phone, email, DOB, gender,
 * address, ACTIVE↔INACTIVE status). Phone-check ignores the same customer.
 * PENDING_APPROVAL redirects to Review; More Actions stays disabled on detail.
 */
export function EditCustomerPage({ customerId }: { customerId: string }) {
  const { t } = useLocale();
  const { navigate, setNavigationBlocker } = useOwnerPath();
  const { storeName, tenantName } = useTenantChrome();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [form, setForm] = useState<EditCustomerFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const bypassNavigation = useRef(false);
  const navigateRef = useRef(navigate);

  const [phoneCheck, setPhoneCheck] = useState<PhoneCheckState>({
    status: "idle",
  });

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    void fetchCustomerDetail(customerId)
      .then((payload) => {
        if (cancelled) return;
        if (payload.profile.status === "PENDING_APPROVAL") {
          navigateRef.current(
            `/customers/${encodeURIComponent(payload.profile.id)}/review`,
          );
          return;
        }
        if (
          payload.profile.status !== "ACTIVE" &&
          payload.profile.status !== "INACTIVE"
        ) {
          navigateRef.current(
            `/customers/${encodeURIComponent(payload.profile.id)}`,
          );
          return;
        }
        setCustomer(payload);
        setForm(toForm(payload.profile));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCustomer(null);
        setForm(null);
        setLoading(false);
        if (err instanceof ApiError && err.statusCode === 404) {
          setLoadError(t("customers.detail.notFound"));
        } else if (err instanceof ApiError) {
          setLoadError(err.message);
        } else {
          setLoadError(t("customers.edit.loadError"));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customerId, reload, t]);

  const dirty = Boolean(
    customer &&
      form &&
      (form.name.trim() !== customer.profile.name ||
        form.phone.trim() !== customer.profile.phone ||
        form.email.trim() !== (customer.profile.email ?? "") ||
        form.dateOfBirth !==
          (customer.profile.dateOfBirth
            ? customer.profile.dateOfBirth.slice(0, 10)
            : "") ||
        form.gender !== (customer.profile.gender ?? "") ||
        form.address.trim() !== (customer.profile.address ?? "") ||
        form.status !== customer.profile.status),
  );

  useEffect(() => {
    const blockNavigation = (to: string) => {
      if (bypassNavigation.current || !dirty || submitting) return true;
      setPendingNavigation(to);
      return false;
    };
    setNavigationBlocker(blockNavigation);
    return () => setNavigationBlocker(null);
  }, [dirty, setNavigationBlocker, submitting]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  useEffect(() => {
    const phone = form?.phone.trim() ?? "";
    if (phone.length < MIN_PHONE_LENGTH) {
      setPhoneCheck({ status: "idle" });
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setPhoneCheck({ status: "checking" });
      void checkCustomerPhone(phone)
        .then((res) => {
          if (cancelled) return;
          if (res.exists && res.customer && res.customer.id !== customerId) {
            setPhoneCheck({ status: "duplicate", customer: res.customer });
          } else {
            setPhoneCheck({ status: "available" });
          }
        })
        .catch(() => {
          if (cancelled) return;
          setPhoneCheck({ status: "idle" });
        });
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [form?.phone, customerId]);

  function update<K extends keyof EditCustomerFormState>(
    key: K,
    value: EditCustomerFormState[K],
  ) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    if (key === "name" || key === "phone" || key === "email") {
      setFieldErrors((current) => ({ ...current, [key]: undefined }));
    }
    setSubmitError(null);
  }

  function blurField(key: "name" | "phone" | "email") {
    setFieldErrors((current) => {
      const next = { ...current };
      if (key === "name" && !(form?.name.trim() ?? "")) {
        next.name = t("customers.add.nameRequired");
      } else if (key === "phone" && !(form?.phone.trim() ?? "")) {
        next.phone = t("customers.add.phoneRequired");
      } else if (
        key === "email" &&
        (form?.email.trim() ?? "") &&
        !EMAIL_PATTERN.test(form?.email.trim() ?? "")
      ) {
        next.email = t("customers.add.emailInvalid");
      } else {
        next[key] = undefined;
      }
      return next;
    });
  }

  function validate(): boolean {
    if (!form) return false;
    const nextErrors: FieldErrors = {};
    if (!form.name.trim()) nextErrors.name = t("customers.add.nameRequired");
    if (!form.phone.trim()) nextErrors.phone = t("customers.add.phoneRequired");
    if (form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) {
      nextErrors.email = t("customers.add.emailInvalid");
    }
    setFieldErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  }

  async function save() {
    if (!customer || !validate() || submitting || !form) return;
    if (phoneCheck.status === "duplicate") return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateCustomer(customer.profile.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        dateOfBirth: form.dateOfBirth
          ? new Date(`${form.dateOfBirth}T00:00:00`)
          : null,
        gender: form.gender || null,
        address: form.address.trim() || null,
        status: form.status,
      });
      bypassNavigation.current = true;
      setNavigationBlocker(null);
      navigate(`/customers/${encodeURIComponent(customer.profile.id)}`);
    } catch (error: unknown) {
      setSubmitting(false);
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : t("customers.edit.submitError"),
      );
    }
  }

  function goToDetails() {
    if (!customer) {
      navigate("/customers");
      return;
    }
    navigate(`/customers/${encodeURIComponent(customer.profile.id)}`);
  }

  function discardChanges() {
    const target = pendingNavigation;
    bypassNavigation.current = true;
    setPendingNavigation(null);
    setNavigationBlocker(null);
    if (target) {
      window.history.pushState({}, "", target);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }

  function viewExisting(dup: PhoneCheckCustomer) {
    const path =
      dup.status === "PENDING_APPROVAL"
        ? `/customers/${encodeURIComponent(dup.id)}/review`
        : `/customers/${encodeURIComponent(dup.id)}`;
    navigate(path);
  }

  const branchName =
    customer?.profile.storeName || storeName || tenantName || "—";
  const canSave =
    dirty &&
    !submitting &&
    Boolean(form?.name.trim() && form.phone.trim()) &&
    phoneCheck.status !== "duplicate";

  if (loading && !form) {
    return (
      <div className="w-full px-5 py-4">
        <p className="text-sm text-muted">{t("customers.edit.loading")}</p>
      </div>
    );
  }

  if (loadError && !form) {
    return (
      <div className="w-full px-5 py-4">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          <p className="text-destructive">{loadError}</p>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1 text-foreground hover:bg-canvas"
            onClick={() => setReload((n) => n + 1)}
          >
            {t("customers.detail.retry")}
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1 text-foreground hover:bg-canvas"
            onClick={() => navigate("/customers")}
          >
            {t("customers.detail.back")}
          </button>
        </div>
      </div>
    );
  }

  if (!form || !customer) return null;

  return (
    <div className="w-full px-5 py-4">
      {pendingNavigation ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={() => setPendingNavigation(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-edit-customer-title"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
                <AlertCircle className="size-5" />
              </span>
              <div>
                <h2
                  id="unsaved-edit-customer-title"
                  className="text-lg font-semibold text-slate-950"
                >
                  {t("customers.edit.unsavedTitle")}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {t("customers.edit.unsavedBody")}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setPendingNavigation(null)}
              >
                {t("customers.add.keepEditing")}
              </button>
              <button
                type="button"
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={discardChanges}
              >
                {t("customers.add.discardChanges")}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <nav
        aria-label={t("header.breadcrumb")}
        className="mb-3 text-sm text-muted"
      >
        <button
          type="button"
          className="hover:text-foreground hover:underline"
          onClick={() => navigate("/customers")}
        >
          {t("nav.customers")}
        </button>
        <span className="px-1.5">›</span>
        <button
          type="button"
          className="hover:text-foreground hover:underline"
          onClick={goToDetails}
        >
          {customer.profile.name}
        </button>
        <span className="px-1.5">›</span>
        <span className="text-foreground">{t("customers.edit.crumb")}</span>
      </nav>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("customers.edit.title")}
            </h1>
            <StatusBadge status={form.status} />
          </div>
          <p className="mt-1 text-sm text-muted">{t("customers.edit.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={goToDetails}
          className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-canvas"
        >
          {t("customers.edit.cancel")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2.4fr)_minmax(240px,1fr)]">
        <div className="flex flex-col gap-4">
          <section className="rounded-xl border border-border bg-surface p-5">
            <SectionHeader
              icon={<Users className="size-4 text-primary" strokeWidth={1.75} />}
              title={t("customers.add.customerInfo")}
              hint={t("customers.edit.customerInfoHint")}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label={t("customers.add.name")}
                required
                error={fieldErrors.name}
                errorId="edit-customer-name-error"
              >
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  onBlur={() => blurField("name")}
                  placeholder={t("customers.add.namePlaceholder")}
                  aria-required="true"
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={
                    fieldErrors.name ? "edit-customer-name-error" : undefined
                  }
                  className={inputClass(Boolean(fieldErrors.name))}
                />
              </Field>
              <Field
                label={t("customers.add.phone")}
                required
                error={fieldErrors.phone}
                errorId="edit-customer-phone-error"
              >
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  onBlur={() => blurField("phone")}
                  placeholder={t("customers.add.phonePlaceholder")}
                  aria-required="true"
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={
                    fieldErrors.phone ? "edit-customer-phone-error" : undefined
                  }
                  className={inputClass(Boolean(fieldErrors.phone))}
                />
              </Field>
            </div>

            <div className="mt-2 max-w-full sm:max-w-[50%]" aria-live="polite">
              <PhoneCheckPanel state={phoneCheck} onView={viewExisting} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label={t("customers.add.email")}
                error={fieldErrors.email}
                errorId="edit-customer-email-error"
              >
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                  onBlur={() => blurField("email")}
                  placeholder={t("customers.add.emailPlaceholder")}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={
                    fieldErrors.email ? "edit-customer-email-error" : undefined
                  }
                  className={inputClass(Boolean(fieldErrors.email))}
                />
              </Field>
              <Field label={t("customers.add.dateOfBirth")}>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) => update("dateOfBirth", event.target.value)}
                  className={inputClass(false)}
                />
              </Field>
              <Field label={t("customers.add.gender")}>
                <select
                  value={form.gender}
                  onChange={(event) =>
                    update("gender", event.target.value as GenderOption)
                  }
                  className={inputClass(false)}
                >
                  <option value="">{t("customers.add.genderSelect")}</option>
                  <option value="MALE">{t("customers.add.gender.male")}</option>
                  <option value="FEMALE">
                    {t("customers.add.gender.female")}
                  </option>
                  <option value="OTHER">{t("customers.add.gender.other")}</option>
                </select>
              </Field>
              <Field label={t("customers.edit.status")}>
                <select
                  value={form.status}
                  onChange={(event) =>
                    update("status", event.target.value as EditableStatus)
                  }
                  className={inputClass(false)}
                >
                  <option value="ACTIVE">{t("customers.status.active")}</option>
                  <option value="INACTIVE">
                    {t("customers.status.inactive")}
                  </option>
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label={t("customers.add.address")}>
                  <textarea
                    rows={3}
                    value={form.address}
                    onChange={(event) => update("address", event.target.value)}
                    placeholder={t("customers.add.addressPlaceholder")}
                    className="w-full min-h-[80px] resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                </Field>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="rounded-xl border border-teal-200 bg-teal-50 p-5">
            <SectionHeader
              icon={<Info className="size-4 text-teal-700" strokeWidth={1.75} />}
              title={t("customers.edit.rulesTitle")}
            />
            <p className="text-sm leading-relaxed text-teal-900">
              {t("customers.edit.rulesBody")}
            </p>
          </section>
          <section className="rounded-xl border border-border bg-surface p-5">
            <SectionHeader
              icon={
                <UserRound className="size-4 text-primary" strokeWidth={1.75} />
              }
              title={t("customers.add.systemTitle")}
            />
            <dl>
              <InfoRow
                label={t("customers.add.systemSource")}
                value={t(
                  customer.profile.source === "OWNER_CREATED"
                    ? "customers.source.ownerCreated"
                    : "customers.source.posRegistration",
                )}
              />
              <InfoRow
                label={t("customers.add.systemBranch")}
                value={branchName}
              />
              <InfoRow
                label={t("customers.edit.loyaltyPoints")}
                value={String(customer.profile.loyaltyPoints)}
              />
            </dl>
            <p className="mt-3 text-xs text-muted">
              {t("customers.edit.systemNote")}
            </p>
          </section>
        </div>
      </div>

      {submitError ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {submitError}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={goToDetails}
          className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-canvas"
        >
          {t("customers.edit.cancel")}
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => void save()}
          className="inline-flex items-center gap-2 rounded-md bg-[#007a70] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00635c] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" strokeWidth={1.75} />
          )}
          {submitting
            ? t("customers.edit.saving")
            : t("customers.edit.saveChanges")}
        </button>
      </div>
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return `w-full rounded-md border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:ring-1 ${
    hasError
      ? "border-red-400 focus:border-red-400 focus:ring-red-400"
      : "border-border focus:border-teal-600 focus:ring-teal-600"
  }`;
}

function SectionHeader({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-2 border-b border-border pb-3">
      <span className="mt-0.5">{icon}</span>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  errorId,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  errorId?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
      {error ? (
        <span
          id={errorId}
          role="alert"
          className="mt-1 block text-xs text-destructive"
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="max-w-[60%] truncate text-right text-sm font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({ status }: { status: CustomerStatus | EditableStatus }) {
  const { t } = useLocale();
  const label = t(
    status === "ACTIVE"
      ? "customers.status.active"
      : status === "PENDING_APPROVAL"
        ? "customers.status.pending"
        : "customers.status.inactive",
  );
  const tone =
    status === "ACTIVE"
      ? "bg-teal-200/70 text-teal-800"
      : status === "PENDING_APPROVAL"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-200 text-slate-500";
  return (
    <span className={`rounded-sm px-2 py-1 text-[10px] font-medium ${tone}`}>
      {label}
    </span>
  );
}

function PhoneCheckPanel({
  state,
  onView,
}: {
  state: PhoneCheckState;
  onView: (customer: PhoneCheckCustomer) => void;
}) {
  const { t } = useLocale();
  if (state.status === "idle") return null;
  if (state.status === "checking") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-canvas px-3 py-2 text-xs text-muted">
        <Loader2 className="size-3.5 animate-spin" />
        <span>{t("customers.add.phoneCheck.checking")}</span>
      </div>
    );
  }
  if (state.status === "available") {
    return (
      <div className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800">
        <div className="flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="size-3.5" strokeWidth={1.75} />
          {t("customers.add.phoneCheck.title")}
        </div>
        <p className="mt-0.5">{t("customers.add.phoneCheck.available")}</p>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <div className="flex items-center gap-1.5 font-medium">
        <AlertCircle className="size-3.5" strokeWidth={1.75} />
        {t("customers.add.phoneCheck.title")}
      </div>
      <p className="mt-0.5">{t("customers.add.phoneCheck.duplicate")}</p>
      <button
        type="button"
        className="mt-1.5 font-semibold text-amber-950 underline hover:no-underline"
        onClick={() => onView(state.customer)}
      >
        {t("customers.add.phoneCheck.viewProfile")}
      </button>
    </div>
  );
}
