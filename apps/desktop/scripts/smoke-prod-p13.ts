/**
 * Prod Batch P13 smoke — Desktop Transactions → cloud.
 * Run: npm run smoke:prod-p13 -w @r2a/desktop
 *
 * Source guards only (no live API). Reuses existing GET /sales + /sales/:id;
 * desktop online cloud list/detail + offline local merge; Owner web untouched.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const REPO = join(ROOT, "..", "..");

function readRel(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function readSrc(rel: string): string {
  return readFileSync(join(SRC, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(REPO, rel), "utf8");
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const P13_I18N = [
  "txns.subtitleCloud",
  "txns.emptyHintCloud",
  "txns.loading",
  "txns.cloudFailed",
  "txns.detailLoading",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/desktop", `package name must be @r2a/desktop, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:prod-p13"]?.includes("smoke-prod-p13"),
    "package.json must define smoke:prod-p13",
  );
  console.log("  ✓ package @r2a/desktop + smoke:prod-p13");
}

function checkCloudClient(): void {
  const cloud = readSrc("lib/cloudSales.ts");
  assert(
    cloud.includes("/api/v1/sales") &&
      cloud.includes("listCloudSales") &&
      cloud.includes("getCloudSale") &&
      cloud.includes("mergeCloudWithLocal") &&
      cloud.includes("cloudSaleToLoggedTransaction") &&
      cloud.includes("cloud is historical source of truth"),
    "cloudSales must list/get/merge with cloud-canonical lock",
  );
  console.log("  ✓ cloudSales client");
}

function checkDesktopUi(): void {
  const panel = readSrc("features/transactions/TransactionsPanel.tsx");
  const store = readSrc("lib/transactionLogStore.ts");
  const detail = readSrc("features/transactions/TransactionDetailView.tsx");

  assert(
    panel.includes("listCloudSales") &&
      panel.includes("getCloudSale") &&
      panel.includes("mergeCloudWithLocal") &&
      panel.includes("useConnectivity") &&
      panel.includes("isOnline") &&
      panel.includes("txns.subtitleCloud") &&
      panel.includes("txns.cloudFailed"),
    "TransactionsPanel must fetch cloud when online + merge local",
  );
  assert(
    store.includes("Prod P13") && store.includes("cloudSales"),
    "transactionLogStore must document P13 offline/local-only role",
  );
  assert(
    detail.includes("Prod P13") || detail.includes("GET /sales/:id"),
    "TransactionDetailView must note cloud detail preference",
  );
  console.log("  ✓ desktop Transactions online/offline wiring");
}

function checkApisUnchanged(): void {
  const router = readRepo("apps/server/src/modules/sale/sale.router.ts");
  const webSales = readRepo("apps/web/src/lib/salesList.ts");
  assert(
    router.includes('saleListQuerySchema') &&
      router.includes('"/:id"') &&
      router.includes("saleController.list") &&
      router.includes("saleController.getById"),
    "GET /sales + /sales/:id router must remain",
  );
  assert(
    webSales.includes("/api/v1/sales") && webSales.includes("fetchSales"),
    "Owner web salesList must still call GET /sales (unchanged)",
  );
  console.log("  ✓ sales APIs + Owner web list untouched");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of P13_I18N) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }
  console.log("  ✓ txns cloud i18n keys in en + bn-BD");
}

function checkDocs(): void {
  const catalog = readRepo("Completed_API_lists.md");
  const status = readRepo("Current_Status.md");
  assert(
    catalog.includes("Prod Batch P13") &&
      (catalog.includes("Desktop Transactions") ||
        catalog.includes("desktop Transactions")),
    "Completed_API_lists must document P13 desktop cloud transactions",
  );
  assert(
    status.includes("P13") &&
      (status.includes("9b") || status.includes("Transactions")) &&
      (status.includes("cloud") || status.includes("GET /sales")),
    "Current_Status §12 9b / board must reflect P13 cloud txns",
  );
  console.log("  ✓ catalog + status mention P13");
}

function main(): void {
  console.log("smoke:prod-p13 — Desktop Transactions → cloud\n");
  checkPackage();
  checkCloudClient();
  checkDesktopUi();
  checkApisUnchanged();
  checkI18n();
  checkDocs();
  console.log("\nPASS");
}

main();
