/**
 * Prod Batch P2 smoke — Owner Edit Supplier.
 * Run: npm run smoke:prod-p2 -w @r2a/web
 *
 * Source guards only (no live API). Edit Supplier is live at
 * `/suppliers/:id/edit` via GET + PATCH /owner/suppliers/:id.
 * Fields mirror Add Supplier; status ACTIVE ↔ HOLD (DRAFT only if already).
 * Unsaved-changes guard. Success → detail. No Save as Draft (P15).
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

const EDIT_SUPPLIER_I18N_KEYS = [
  "suppliers.detail.editSupplier",
  "suppliers.edit.crumb",
  "suppliers.edit.title",
  "suppliers.edit.subtitle",
  "suppliers.edit.cancel",
  "suppliers.edit.saveChanges",
  "suppliers.edit.saving",
  "suppliers.edit.companyHint",
  "suppliers.edit.status",
  "suppliers.edit.rulesTitle",
  "suppliers.edit.rulesBody",
  "suppliers.edit.unsavedTitle",
  "suppliers.edit.unsavedBody",
  "suppliers.edit.loading",
  "suppliers.edit.loadError",
  "suppliers.edit.submitError",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/web", `package name must be @r2a/web, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:prod-p2"]?.includes("smoke-prod-p2"),
    "package.json must define smoke:prod-p2",
  );
  console.log("  ✓ package @r2a/web + smoke:prod-p2");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of EDIT_SUPPLIER_I18N_KEYS) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }
  console.log("  ✓ suppliers.edit i18n keys in en + bn-BD");
}

function checkLib(): void {
  const lib = readSrc("lib/suppliers.ts");
  assert(
    lib.includes("updateOwnerSupplier") &&
      lib.includes('method: "PATCH"') &&
      lib.includes("/api/v1/owner/suppliers/${encodeURIComponent(supplierId)}"),
    "suppliers lib must PATCH /api/v1/owner/suppliers/:id via updateOwnerSupplier",
  );
  assert(
    lib.includes("fetchSupplierDetail") &&
      lib.includes("SupplierUpdatePayload"),
    "Edit flow must reuse detail fetch + typed update payload",
  );
  console.log("  ✓ live PATCH client + typed update payload");
}

function checkRoute(): void {
  const ownerPath = readSrc("lib/ownerPath.ts");
  const shell = readSrc("features/shell/AppShell.tsx");
  const index = readSrc("features/suppliers/index.ts");
  assert(
    ownerPath.includes('kind: "edit"') &&
      ownerPath.includes('parts[1] === "edit"') &&
      ownerPath.includes("supplierId"),
    "suppliersSubpath must resolve /suppliers/:id/edit",
  );
  assert(
    shell.includes("EditSupplierPage") &&
      shell.includes('sub.kind === "edit"'),
    "AppShell must route /suppliers/:id/edit to EditSupplierPage",
  );
  assert(
    index.includes("EditSupplierPage"),
    "suppliers feature index must export EditSupplierPage",
  );
  console.log("  ✓ /suppliers/:id/edit route wired");
}

function checkPage(): void {
  const page = readSrc("features/suppliers/EditSupplierPage.tsx");
  const detail = readSrc("features/suppliers/SupplierDetailsPage.tsx");
  const add = readSrc("features/suppliers/AddSupplierPage.tsx");

  assert(
    page.includes("fetchSupplierDetail") &&
      page.includes("updateOwnerSupplier"),
    "EditSupplierPage must load detail and PATCH",
  );
  assert(
    page.includes('"ACTIVE"') &&
      page.includes('"HOLD"') &&
      page.includes("suppliers.edit.status"),
    "Status select must allow ACTIVE ↔ HOLD",
  );
  assert(
    page.includes("setNavigationBlocker") &&
      page.includes("suppliers.edit.unsavedTitle") &&
      page.includes("beforeunload"),
    "Unsaved-changes guard required",
  );
  assert(
    page.includes("/suppliers/${encodeURIComponent(supplier.id)}") &&
      page.includes("Save"),
    "Successful save must navigate back to Supplier Details",
  );
  assert(
    !page.includes('t("suppliers.add.submit")') &&
      !/saveAsDraft/i.test(page) &&
      !page.includes("disabled={true}") &&
      !/type="button"[^>]*>[\s\S]*Save as Draft/i.test(page),
    "Edit Supplier must not invent a Save as Draft control (Wave 4 P15)",
  );
  assert(
    page.includes("Wave 4 P15") || page.includes("not offered"),
    "Edit page should document that Save as Draft is deferred to P15",
  );
  assert(
    detail.includes("/suppliers/${encodeURIComponent(supplier.id)}/edit") &&
      detail.includes('t("suppliers.detail.editSupplier")'),
    "Supplier Details Edit Supplier must navigate to /suppliers/:id/edit",
  );
  assert(
    add.includes("createOwnerSupplier") &&
      add.includes('status: "ACTIVE"'),
    "Add Supplier must remain ACTIVE-create (no draft invent)",
  );
  console.log("  ✓ EditSupplierPage form + detail CTA; no Save as Draft");
}

function checkNoMockData(): void {
  const files = walkTs(SRC);
  const suppliersOnly = files
    .filter((p) => p.includes("suppliers"))
    .map((p) => readFileSync(p, "utf8"))
    .join("\n");
  assert(
    !/Renata Limited/.test(suppliersOnly) ||
      suppliersOnly.includes("namePlaceholder"),
    "Edit Supplier must not hard-code sample supplier names outside placeholders",
  );
  assert(
    !/₺/.test(suppliersOnly) && !/\$\d/.test(suppliersOnly),
    "Edit Supplier must not hard-code ₺ or mock dollar totals",
  );
  console.log("  ✓ no invented mock currency totals");
}

function main(): void {
  console.log("Prod Batch P2 smoke (@r2a/web)\n");
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
