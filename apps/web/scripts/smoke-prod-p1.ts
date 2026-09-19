/**
 * Prod Batch P1 smoke — Owner Edit Customer.
 * Run: npm run smoke:prod-p1 -w @r2a/web
 *
 * Source guards only (no live API). Edit Customer is live at
 * `/customers/:id/edit` via GET /owner/customers/:id + PATCH /customers/:id.
 * Fields: name, phone, email, DOB, gender, address, ACTIVE↔INACTIVE status.
 * Phone-check ignores the same customer. Unsaved-changes guard. Success → detail.
 * More Actions remains disabled on Customer Details.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");

function readRel(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function readSrc(rel: string): string {
  return readFileSync(join(SRC, rel), "utf8");
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkTs(p, acc);
    else if (ent.name.endsWith(".ts") || ent.name.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

const EDIT_CUSTOMER_I18N_KEYS = [
  "customers.edit.crumb",
  "customers.edit.title",
  "customers.edit.subtitle",
  "customers.edit.cancel",
  "customers.edit.saveChanges",
  "customers.edit.saving",
  "customers.edit.customerInfoHint",
  "customers.edit.status",
  "customers.edit.rulesTitle",
  "customers.edit.rulesBody",
  "customers.edit.loyaltyPoints",
  "customers.edit.systemNote",
  "customers.edit.unsavedTitle",
  "customers.edit.unsavedBody",
  "customers.edit.loading",
  "customers.edit.loadError",
  "customers.edit.submitError",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/web", `package name must be @r2a/web, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:prod-p1"]?.includes("smoke-prod-p1"),
    "package.json must define smoke:prod-p1",
  );
  console.log("  ✓ package @r2a/web + smoke:prod-p1");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of EDIT_CUSTOMER_I18N_KEYS) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }
  console.log("  ✓ customers.edit i18n keys in en + bn-BD");
}

function checkLib(): void {
  const lib = readSrc("lib/customers.ts");
  assert(
    lib.includes("updateCustomer") &&
      lib.includes('method: "PATCH"') &&
      lib.includes("/api/v1/customers/${encodeURIComponent(customerId)}"),
    "customers lib must PATCH /api/v1/customers/:id via updateCustomer",
  );
  assert(
    lib.includes("dateOfBirth") &&
      lib.includes("gender") &&
      lib.includes("address") &&
      lib.includes('"ACTIVE" | "INACTIVE"'),
    "CustomerUpdatePayload must include profile fields + ACTIVE|INACTIVE status",
  );
  assert(
    lib.includes("checkCustomerPhone") &&
      lib.includes("fetchCustomerDetail"),
    "Edit flow must reuse phone-check + owner detail fetch",
  );
  console.log("  ✓ live PATCH client + typed update payload");
}

function checkRoute(): void {
  const ownerPath = readSrc("lib/ownerPath.ts");
  const shell = readSrc("features/shell/AppShell.tsx");
  const index = readSrc("features/customers/index.ts");
  assert(
    ownerPath.includes('kind: "edit"') &&
      ownerPath.includes('parts[1] === "edit"'),
    "customersSubpath must resolve /customers/:id/edit",
  );
  assert(
    shell.includes("EditCustomerPage") &&
      shell.includes('sub.kind === "edit"'),
    "AppShell must route /customers/:id/edit to EditCustomerPage",
  );
  assert(
    index.includes("EditCustomerPage"),
    "customers feature index must export EditCustomerPage",
  );
  console.log("  ✓ /customers/:id/edit route wired");
}

function checkPage(): void {
  const page = readSrc("features/customers/EditCustomerPage.tsx");
  const detail = readSrc("features/customers/CustomerDetailsPage.tsx");

  assert(
    page.includes("fetchCustomerDetail") &&
      page.includes("updateCustomer") &&
      page.includes("checkCustomerPhone"),
    "EditCustomerPage must load detail, phone-check, and PATCH",
  );
  assert(
    page.includes('res.customer.id !== customerId') &&
      page.includes("phoneCheck.status !== \"duplicate\""),
    "Phone-check must ignore the same customer and block save on duplicates",
  );
  assert(
    page.includes('status === "PENDING_APPROVAL"') &&
      page.includes("/review"),
    "PENDING_APPROVAL must redirect to Registration Review",
  );
  assert(
    page.includes('"ACTIVE"') &&
      page.includes('"INACTIVE"') &&
      page.includes("customers.edit.status"),
    "Status select must allow ACTIVE ↔ INACTIVE only",
  );
  assert(
    page.includes("setNavigationBlocker") &&
      page.includes("customers.edit.unsavedTitle") &&
      page.includes("beforeunload"),
    "Unsaved-changes guard required",
  );
  assert(
    page.includes("/customers/${encodeURIComponent(customer.profile.id)}") &&
      page.includes("Save"),
    "Successful save must navigate back to Customer Details",
  );
  assert(
    detail.includes("/customers/${encodeURIComponent(profile.id)}/edit") &&
      detail.includes('t("customers.detail.editCustomer")'),
    "Customer Details Edit Customer must navigate to /customers/:id/edit",
  );
  assert(
    detail.includes('t("customers.detail.moreActions")') &&
      detail.includes('title={t("customers.detail.moreSoon")}') &&
      detail.includes('aria-disabled="true"'),
    "More Actions must remain disabled on Customer Details",
  );
  console.log("  ✓ EditCustomerPage form + detail CTA + More Actions still disabled");
}

function checkNoMockData(): void {
  const files = walkTs(SRC);
  const customersOnly = files
    .filter((p) => p.includes("customers"))
    .map((p) => readFileSync(p, "utf8"))
    .join("\n");
  assert(
    !/Sadia Akter/.test(customersOnly) && !/Ayesha Rahman/.test(customersOnly),
    "Edit Customer must not hard-code sample customer names",
  );
  assert(
    !/৳\d/.test(customersOnly),
    "Edit Customer must not hard-code mock ৳ totals",
  );
  console.log("  ✓ no invented sample customer data / mock ৳");
}

function main(): void {
  console.log("Prod Batch P1 smoke (@r2a/web)\n");
  checkPackage();
  checkI18n();
  checkLib();
  checkRoute();
  checkPage();
  checkNoMockData();
  console.log("\nPASS");
}

try {
  main();
} catch (err) {
  console.error("\nFAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
}
