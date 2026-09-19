/**
 * Prod Batch P12 smoke — Cloud soft held sales.
 * Run: npm run smoke:prod-p12 -w @r2a/desktop
 *
 * Source guards only (no live API). Prisma HeldSale + cashier APIs,
 * desktop online cloud / offline local + Go Online reconcile,
 * soft hold (no stock reservation), max 3, mid-payment Hold abort unchanged.
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

const P12_I18N = [
  "hold.parkedCloud",
  "hold.cloudFailed",
  "hold.subtitleCloud",
  "hold.discardBodyCloud",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/desktop", `package name must be @r2a/desktop, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:prod-p12"]?.includes("smoke-prod-p12"),
    "package.json must define smoke:prod-p12",
  );
  console.log("  ✓ package @r2a/desktop + smoke:prod-p12");
}

function checkSchemaAndZod(): void {
  const schema = readRepo("packages/database/prisma/schema.prisma");
  const migration = readRepo(
    "packages/database/prisma/migrations/20260918140000_prod_p12_held_sale/migration.sql",
  );
  const zod = readRepo("packages/shared-types/src/heldSale.ts");
  const index = readRepo("packages/shared-types/src/index.ts");

  assert(
    schema.includes("model HeldSale") &&
      schema.includes("HeldSaleStatus") &&
      schema.includes("payload") &&
      schema.includes("terminalId") &&
      !schema.includes("quantityReserved"),
    "Prisma HeldSale soft-hold model required",
  );
  assert(
    migration.includes("HeldSale") && migration.includes("HeldSaleStatus"),
    "P12 migration must create HeldSale",
  );
  assert(
    zod.includes("heldSaleCreateSchema") &&
      zod.includes("MAX_HELD_SALES = 3") &&
      zod.includes("heldSaleIdParamSchema") &&
      index.includes("./heldSale"),
    "shared-types heldSale contracts must be exported",
  );
  console.log("  ✓ Prisma + Zod HeldSale");
}

function checkApis(): void {
  const router = readRepo("apps/server/src/modules/heldSale/heldSale.router.ts");
  const service = readRepo("apps/server/src/modules/heldSale/heldSale.service.ts");
  const routes = readRepo("apps/server/src/routes/index.ts");

  assert(
    router.includes('"/held-sales"') === false &&
      router.includes("heldSaleCreateSchema") &&
      router.includes('"/:heldSaleId/discard"') &&
      router.includes('"/:heldSaleId/resume-ack"') &&
      router.includes('restrictTo("CASHIER", "MANAGER", "OWNER")'),
    "held-sale router must expose create/list/get/discard/resume-ack for cashier JWT",
  );
  assert(
    service.includes("MAX_HELD_SALES") &&
      service.includes('status: "HELD"') &&
      service.includes("DISCARDED") &&
      service.includes("RESUMED") &&
      !service.includes("quantityOnHand") &&
      !service.includes("reserve"),
    "held-sale service soft hold only — no stock reservation",
  );
  assert(
    routes.includes('"/held-sales"') && routes.includes("heldSaleRouter"),
    "domainRouter must mount /held-sales",
  );
  console.log("  ✓ held-sales cashier APIs");
}

function checkDesktop(): void {
  const cloud = readSrc("lib/cloudHeldSales.ts");
  const store = readSrc("lib/heldSaleStore.ts");
  const app = readSrc("App.tsx");
  const panel = readSrc("features/hold/HeldSalesPanel.tsx");
  const shell = readSrc("features/shell/AppShell.tsx");

  assert(
    cloud.includes("/api/v1/held-sales") &&
      cloud.includes("reconcileHeldSalesOnOnline") &&
      cloud.includes("cloud canonical") &&
      cloud.includes("push local-only"),
    "cloudHeldSales must CRUD + reconcile (cloud canonical; push local-only)",
  );
  assert(
    store.includes("replaceAll") &&
      store.includes("put(") &&
      store.includes("Prod P12"),
    "heldSaleStore must support put/replaceAll + document Prod P12",
  );
  assert(
    app.includes("cloudCreateHeldSale") &&
      app.includes("cloudResumeAckHeldSale") &&
      app.includes("reconcileHeldSalesOnOnline") &&
      app.includes("discardHeldSale") &&
      app.includes("abortOpenTenders"),
    "App must park/resume/discard via cloud when online + keep tender abort on Hold",
  );
  assert(
    panel.includes("cloudListHeldSales") &&
      panel.includes("hold.subtitleCloud") &&
      shell.includes("onDiscardHeld"),
    "Held list must fetch cloud when online; discard wired through shell",
  );
  console.log("  ✓ desktop cloud hold + offline fallback + Hold abort");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of P12_I18N) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }
  console.log("  ✓ hold cloud i18n keys in en + bn-BD");
}

function checkDocs(): void {
  const catalog = readRepo("Completed_API_lists.md");
  const status = readRepo("Current_Status.md");
  assert(
    catalog.includes("Prod Batch P12") && catalog.includes("/held-sales"),
    "Completed_API_lists must document P12 held-sales",
  );
  assert(
    status.includes("P12") &&
      (status.includes("cloud hold") || status.includes("Cloud held") || status.includes("shared held")),
    "Current_Status §12 9d / board must reflect P12 cloud holds",
  );
  console.log("  ✓ catalog + status mention P12");
}

function main(): void {
  console.log("smoke:prod-p12 — Cloud soft held sales\n");
  checkPackage();
  checkSchemaAndZod();
  checkApis();
  checkDesktop();
  checkI18n();
  checkDocs();
  console.log("\nPASS");
}

main();
