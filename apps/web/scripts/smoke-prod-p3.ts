/**
 * Prod Batch P3 smoke — View All POs by supplier.
 * Run: npm run smoke:prod-p3 -w @r2a/web
 *
 * Source guards only (no live API). Supplier Details View All POs deep-links
 * to `/purchasing?supplierId=…`. Purchasing list sends supplierId to
 * GET /owner/purchase-orders and shows a clearable filter chip.
 * No new report page.
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

const P3_I18N_KEYS = [
  "suppliers.detail.po.viewAll",
  "purchasing.filter.supplier",
  "purchasing.filter.supplierLoading",
  "purchasing.filter.clearSupplier",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/web", `package name must be @r2a/web, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:prod-p3"]?.includes("smoke-prod-p3"),
    "package.json must define smoke:prod-p3",
  );
  console.log("  ✓ package @r2a/web + smoke:prod-p3");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of P3_I18N_KEYS) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }
  assert(
    !en.includes('"suppliers.detail.po.viewAllSoon"') &&
      !bn.includes('"suppliers.detail.po.viewAllSoon"'),
    "suppliers.detail.po.viewAllSoon must be retired (POs filter is live)",
  );
  console.log("  ✓ purchasing supplier-filter i18n keys in en + bn-BD");
}

function checkLib(): void {
  const lib = readSrc("lib/purchaseOrders.ts");
  assert(
    lib.includes("supplierId?: string") &&
      lib.includes('q.set("supplierId", supplierId)'),
    "fetchPurchaseOrders must send supplierId query param",
  );
  assert(
    lib.includes("/api/v1/owner/purchase-orders?"),
    "PO list client must hit GET /api/v1/owner/purchase-orders",
  );
  console.log("  ✓ purchaseOrders client sends supplierId");
}

function checkPurchasingPage(): void {
  const page = readSrc("features/purchasing/PurchasingPage.tsx");
  assert(
    page.includes("readSupplierIdFromUrl") &&
      page.includes('window.location.search') &&
      page.includes("supplierId"),
    "PurchasingPage must read supplierId from URL query",
  );
  assert(
    page.includes("supplierId: supplierId || undefined") ||
      page.includes("supplierId: supplierId || undefined,"),
    "PurchasingPage must pass supplierId into fetchPurchaseOrders",
  );
  assert(
    page.includes("purchasing.filter.supplier") &&
      page.includes("purchasing.filter.clearSupplier") &&
      page.includes("clearSupplierFilter"),
    "PurchasingPage must show supplier filter chip + clear",
  );
  assert(
    page.includes('navigate("/purchasing")'),
    "Clearing supplier filter must navigate back to /purchasing",
  );
  console.log("  ✓ Purchasing list filter chip + deep-link");
}

function checkSupplierDetails(): void {
  const detail = readSrc("features/suppliers/SupplierDetailsPage.tsx");
  assert(
    detail.includes("/purchasing?supplierId=") &&
      detail.includes("encodeURIComponent(supplierId)") &&
      detail.includes('t("suppliers.detail.po.viewAll")') &&
      !detail.includes("suppliers.detail.po.viewAllSoon"),
    "View All POs must navigate to /purchasing?supplierId=…",
  );
  assert(
    detail.includes("/inventory?supplierId=") ||
      detail.includes("suppliers.detail.products.viewAll"),
    "Supplier Details still exposes View All Products control",
  );
  console.log("  ✓ Supplier Details View All POs enabled");
}

function checkNoNewReportPage(): void {
  const files = walkTs(join(SRC, "features"));
  const inventReport = files.some((p) => {
    const base = p.replace(/\\/g, "/");
    return (
      base.includes("/reports/") &&
      /PurchaseReport|InventoryReport/i.test(base) &&
      !base.includes("SalesReport")
    );
  });
  assert(!inventReport, "P3 must not invent Inventory/Purchase report pages");
  console.log("  ✓ no new report page invented");
}

function main(): void {
  console.log("Prod Batch P3 smoke (@r2a/web)\n");
  checkPackage();
  checkI18n();
  checkLib();
  checkPurchasingPage();
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
