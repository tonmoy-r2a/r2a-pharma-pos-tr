/**
 * Prod Batch P14 smoke — CSV/Excel catalog import.
 * Run: npm run smoke:prod-p14 -w @r2a/web
 *
 * Source guards (no live upload). OWNER catalog import dry-run/commit,
 * Inventory route `/inventory/import`, caps documented, no bi-di/n8n.
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

const P14_I18N = [
  "inventory.importCatalog",
  "inventory.import.title",
  "inventory.import.commit",
  "inventory.import.limits",
  "inventory.import.columns",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/web", `package name must be @r2a/web, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:prod-p14"]?.includes("smoke-prod-p14"),
    "package.json must define smoke:prod-p14",
  );
  console.log("  ✓ package @r2a/web + smoke:prod-p14");
}

function checkContracts(): void {
  const zod = readRepo("packages/shared-types/src/catalogImport.ts");
  const index = readRepo("packages/shared-types/src/index.ts");
  assert(
    zod.includes("CATALOG_IMPORT_MAX_FILE_BYTES") &&
      zod.includes("CATALOG_IMPORT_MAX_ROWS") &&
      zod.includes("catalogImportUploadSchema") &&
      zod.includes("catalogImportCommitSchema") &&
      zod.includes("buildUnitsFromRow") &&
      index.includes("./catalogImport"),
    "shared-types catalogImport contracts required",
  );
  console.log("  ✓ shared-types catalogImport");
}

function checkApis(): void {
  const router = readRepo("apps/server/src/modules/owner/owner.router.ts");
  const service = readRepo(
    "apps/server/src/modules/owner/catalogImport.service.ts",
  );
  const app = readRepo("apps/server/src/app.ts");
  const serverPkg = JSON.parse(
    readRepo("apps/server/package.json"),
  ) as { dependencies?: Record<string, string> };

  assert(
    router.includes('"/catalog/import/dry-run"') &&
      router.includes('"/catalog/import/commit"') &&
      router.includes("catalogImportUploadSchema") &&
      router.includes("catalogImportCommitSchema"),
    "OWNER catalog import dry-run + commit routes required",
  );
  assert(
    service.includes("dryRunCatalogImport") &&
      service.includes("commitCatalogImport") &&
      service.includes("sku") &&
      service.includes("buildUnitsFromRow") &&
      !service.includes("n8n") &&
      !service.includes("bi-di"),
    "catalogImport service must upsert by sku + units",
  );
  assert(app.includes('limit: "3mb"'), "express.json must allow 3mb uploads");
  assert(
    Boolean(serverPkg.dependencies?.xlsx),
    "server must depend on xlsx for Excel parse",
  );
  console.log("  ✓ OWNER catalog import APIs");
}

function checkWeb(): void {
  const page = readSrc("features/inventory/CatalogImportPage.tsx");
  const client = readSrc("lib/catalogImport.ts");
  const path = readSrc("lib/ownerPath.ts");
  const shell = readSrc("features/shell/AppShell.tsx");
  const list = readSrc("features/inventory/InventoryPage.tsx");

  assert(
    client.includes("/api/v1/owner/catalog/import/dry-run") &&
      client.includes("/api/v1/owner/catalog/import/commit"),
    "web client must call dry-run + commit",
  );
  assert(
    page.includes("dryRunCatalogImport") &&
      page.includes("commitCatalogImport") &&
      page.includes("inventory.import.title"),
    "CatalogImportPage wizard required",
  );
  assert(
    path.includes('kind: "import"') && path.includes('"import"'),
    "ownerPath must register /inventory/import",
  );
  assert(
    shell.includes("CatalogImportPage") && shell.includes('"import"'),
    "AppShell must render CatalogImportPage",
  );
  assert(
    list.includes("/inventory/import") && list.includes("inventory.importCatalog"),
    "Inventory list must link Import Catalog",
  );
  console.log("  ✓ Owner web import wizard under Inventory");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of P14_I18N) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }
  console.log("  ✓ catalog import i18n keys in en + bn-BD");
}

function checkDocs(): void {
  const catalog = readRepo("Completed_API_lists.md");
  const status = readRepo("Current_Status.md");
  assert(
    catalog.includes("Prod Batch P14") &&
      catalog.includes("/catalog/import"),
    "Completed_API_lists must document P14 catalog import",
  );
  assert(
    status.includes("P14") &&
      (status.includes("catalog onboarding") ||
        status.includes("CSV") ||
        status.includes("catalog import")) &&
      status.includes("DONE"),
    "Current_Status §12 note #11 / board must reflect P14 DONE",
  );
  console.log("  ✓ catalog + status mention P14");
}

function main(): void {
  console.log("smoke:prod-p14 — CSV/Excel catalog import\n");
  checkPackage();
  checkContracts();
  checkApis();
  checkWeb();
  checkI18n();
  checkDocs();
  console.log("\nPASS");
}

main();
