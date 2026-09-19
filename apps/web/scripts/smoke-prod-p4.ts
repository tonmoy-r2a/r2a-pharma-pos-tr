/**
 * Prod Batch P4 smoke — View All Products by supplier.
 * Run: npm run smoke:prod-p4 -w @r2a/web
 *
 * Source guards only (no live API). Additive GET /owner/inventory?supplierId=
 * filters products linked via ACTIVE batches and/or PO lines for that supplier.
 * Supplier Details View All Products deep-links to `/inventory?supplierId=…`.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const SHARED_OWNER = join(
  ROOT,
  "..",
  "..",
  "packages",
  "shared-types",
  "src",
  "owner.ts",
);
const SERVER_SERVICE = join(
  ROOT,
  "..",
  "server",
  "src",
  "modules",
  "owner",
  "owner.service.ts",
);

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

const P4_I18N_KEYS = [
  "suppliers.detail.products.viewAll",
  "inventory.filter.supplier",
  "inventory.filter.supplierLoading",
  "inventory.filter.clearSupplier",
  "inventory.emptySupplier",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/web", `package name must be @r2a/web, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:prod-p4"]?.includes("smoke-prod-p4"),
    "package.json must define smoke:prod-p4",
  );
  console.log("  ✓ package @r2a/web + smoke:prod-p4");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of P4_I18N_KEYS) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }
  assert(
    !en.includes('"suppliers.detail.products.viewAllSoon"') &&
      !bn.includes('"suppliers.detail.products.viewAllSoon"'),
    "suppliers.detail.products.viewAllSoon must be retired",
  );
  console.log("  ✓ inventory supplier-filter i18n keys in en + bn-BD");
}

function checkZodAndService(): void {
  const zod = readFileSync(SHARED_OWNER, "utf8");
  assert(
    zod.includes("ownerInventoryQuerySchema") &&
      zod.includes("supplierId:") &&
      zod.includes("Prod P4"),
    "ownerInventoryQuerySchema must accept optional supplierId (Prod P4)",
  );

  const service = readFileSync(SERVER_SERVICE, "utf8");
  assert(
    service.includes("getInventoryList") &&
      service.includes("query.supplierId") &&
      service.includes("supplierProductIds"),
    "getInventoryList must resolve supplier-linked product IDs",
  );
  assert(
    service.includes('status: "ACTIVE"') &&
      service.includes("purchaseOrderLine.findMany") &&
      service.includes("supplierId: query.supplierId"),
    "Supplier link rule must use ACTIVE batches + PO lines",
  );
  console.log("  ✓ Zod + owner inventory service supplierId filter");
}

function checkLib(): void {
  const lib = readSrc("lib/ownerInventory.ts");
  assert(
    lib.includes("supplierId?: string") &&
      lib.includes('q.set("supplierId", supplierId)'),
    "fetchOwnerInventory must send supplierId query param",
  );
  console.log("  ✓ ownerInventory client sends supplierId");
}

function checkInventoryPage(): void {
  const page = readSrc("features/inventory/InventoryPage.tsx");
  assert(
    page.includes("readSupplierIdFromUrl") &&
      page.includes("window.location.search") &&
      page.includes("supplierId: supplierId || undefined"),
    "InventoryPage must read and pass supplierId",
  );
  assert(
    page.includes("inventory.filter.supplier") &&
      page.includes("inventory.filter.clearSupplier") &&
      page.includes("clearSupplierFilter") &&
      page.includes('navigate("/inventory")'),
    "InventoryPage must show supplier filter chip + clear",
  );
  assert(
    page.includes("inventory.emptySupplier"),
    "Honest empty state for supplier filter required",
  );
  console.log("  ✓ Inventory list filter chip + deep-link");
}

function checkSupplierDetails(): void {
  const detail = readSrc("features/suppliers/SupplierDetailsPage.tsx");
  assert(
    detail.includes("/inventory?supplierId=") &&
      detail.includes("encodeURIComponent(supplierId)") &&
      detail.includes('t("suppliers.detail.products.viewAll")') &&
      !detail.includes("suppliers.detail.products.viewAllSoon"),
    "View All Products must navigate to /inventory?supplierId=…",
  );
  console.log("  ✓ Supplier Details View All Products enabled");
}

function checkNoNewReportPage(): void {
  const files = walkTs(join(SRC, "features"));
  const inventReport = files.some((p) => {
    const base = p.replace(/\\/g, "/");
    return (
      /InventoryReport|PurchaseReport/i.test(base) &&
      base.includes("/reports/")
    );
  });
  assert(!inventReport, "P4 must not invent Inventory/Purchase report pages");
  console.log("  ✓ no new report page invented");
}

function main(): void {
  console.log("Prod Batch P4 smoke (@r2a/web)\n");
  checkPackage();
  checkI18n();
  checkZodAndService();
  checkLib();
  checkInventoryPage();
  checkSupplierDetails();
  checkNoNewReportPage();
  console.log("\nPASS");
}

try {
  main();
} catch (err) {
  console.error("\nFAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
}
