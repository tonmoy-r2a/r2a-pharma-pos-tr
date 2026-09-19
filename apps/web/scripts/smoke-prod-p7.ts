/**
 * Prod Batch P7 smoke — CSV Export on loaded Owner pages.
 * Run: npm run smoke:prod-p7 -w @r2a/web
 *
 * Source guards only (no live API / browser download).
 * Client-side CSV only — no thermal print IPC, no server PDF.
 */

import { readFileSync } from "node:fs";
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

const P7_I18N_KEYS = [
  "reports.salesReport.export",
  "reports.salesReport.exportEmpty",
  "reports.inventoryReport.export",
  "reports.inventoryReport.exportEmpty",
  "reports.purchaseReport.export",
  "reports.purchaseReport.exportEmpty",
  "audit.generateReport",
  "audit.exportEmpty",
  "audit.detail.generateReport",
  "audit.detail.exportEmpty",
  "audit.detail.printHint",
  "shifts.detail.generateReport",
  "shifts.detail.exportHint",
  "suppliers.returns.exportHint",
  "suppliers.returns.exportEmpty",
  "suppliers.returns.printSoon",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/web", `package name must be @r2a/web, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:prod-p7"]?.includes("smoke-prod-p7"),
    "package.json must define smoke:prod-p7",
  );
  console.log("  ✓ package @r2a/web + smoke:prod-p7");
}

function checkCsvHelper(): void {
  const helper = readSrc("lib/csvExport.ts");
  assert(helper.includes("export function csvCell"), "csvExport must export csvCell");
  assert(helper.includes("export function downloadCsv"), "csvExport must export downloadCsv");
  assert(helper.includes("export function csvStamp"), "csvExport must export csvStamp");
  assert(helper.includes("\\uFEFF") || helper.includes("\uFEFF"), "CSV must include UTF-8 BOM");
  console.log("  ✓ shared csvExport helper");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of P7_I18N_KEYS) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }
  assert(
    en.includes("Export CSV") && bn.includes("CSV এক্সপোর্ট"),
    "Export labels should be Export CSV / CSV এক্সপোর্ট",
  );
  assert(
    en.includes("Thermal print opens later") &&
      bn.includes("থার্মাল প্রিন্ট পরে খুলবে"),
    "Print hints must defer thermal hardware (Wave 5 S2)",
  );
  console.log("  ✓ CSV / print i18n keys in en + bn-BD");
}

function checkPagesWired(): void {
  const sales = readSrc("features/reports/SalesReportPage.tsx");
  const inventory = readSrc("features/reports/InventoryReportPage.tsx");
  const purchase = readSrc("features/reports/PurchaseReportPage.tsx");
  const auditDash = readSrc("features/audit/AuditDashboardPage.tsx");
  const auditDetail = readSrc("features/audit/AuditDetailPage.tsx");
  const shiftDetail = readSrc("features/staff/ShiftDetailPage.tsx");
  const returns = readSrc("features/suppliers/ExpiryReturnsPage.tsx");

  for (const [name, src] of [
    ["SalesReport", sales],
    ["InventoryReport", inventory],
    ["PurchaseReport", purchase],
    ["AuditDashboard", auditDash],
    ["AuditDetail", auditDetail],
    ["ShiftDetail", shiftDetail],
    ["ExpiryReturns", returns],
  ] as const) {
    assert(
      src.includes("downloadCsv") && src.includes("csvStamp"),
      `${name} must call downloadCsv via csvStamp filenames`,
    );
  }

  assert(
    sales.includes("recentTransactions") && sales.includes("sales-report-"),
    "Sales Report CSV must export loaded recentTransactions",
  );
  assert(
    inventory.includes("inventory-report-") &&
      !inventory.includes("Export disabled until Prod P7"),
    "Inventory Report must enable CSV (P7)",
  );
  assert(
    purchase.includes("purchase-report-") &&
      !purchase.includes("Export disabled until Prod P7"),
    "Purchase Report must enable CSV (P7)",
  );
  assert(
    auditDash.includes("audit-list-") && auditDash.includes("visibleAudits"),
    "Audit dashboard must export loaded audit list",
  );
  assert(
    auditDetail.includes("audit-lines-") &&
      auditDetail.includes("audit.detail.printHint") &&
      auditDetail.includes("disabled"),
    "Audit detail must export lines and keep Print disabled with hint",
  );
  assert(
    shiftDetail.includes("shift-summary-") &&
      shiftDetail.includes("shifts.detail.exportHint"),
    "Shift detail must export variance/sales summary CSV",
  );
  assert(
    returns.includes("expiry-returns-") &&
      returns.includes("suppliers.returns.printSoon") &&
      returns.includes("disabled"),
    "Expiry Returns must export CSV and keep Print disabled",
  );

  assert(
    !sales.includes("print_receipt") &&
      !auditDetail.includes("print_receipt") &&
      !returns.includes("print_receipt"),
    "Must not claim thermal print_receipt IPC in P7",
  );

  console.log("  ✓ Sales / Inventory / Purchase / Audit / Shift / Returns CSV wired");
}

function main(): void {
  console.log("Prod Batch P7 smoke (@r2a/web)\n");
  checkPackage();
  checkCsvHelper();
  checkI18n();
  checkPagesWired();
  console.log("\nPASS");
}

try {
  main();
} catch (err) {
  console.error("\nFAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
}
