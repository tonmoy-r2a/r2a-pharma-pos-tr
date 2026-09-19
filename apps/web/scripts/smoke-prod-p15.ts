/**
 * Prod Batch P15 smoke — Save as Draft GRN + policy.
 * Run: npm run smoke:prod-p15 -w @r2a/web
 *
 * Source guards. GRN draft APIs + receive UI; Supplier/Manifest drafts stay disabled with hints.
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

const P15_I18N = [
  "purchasing.receive.saveDraftHint",
  "purchasing.receive.draftSaved",
  "purchasing.receive.draftResumed",
  "suppliers.add.saveDraft",
  "suppliers.add.saveDraftSoon",
  "suppliers.manifest.saveDraftSoon",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/web", `package name must be @r2a/web, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:prod-p15"]?.includes("smoke-prod-p15"),
    "package.json must define smoke:prod-p15",
  );
  console.log("  ✓ package @r2a/web + smoke:prod-p15");
}

function checkSchema(): void {
  const schema = readRepo("packages/database/prisma/schema.prisma");
  const migration = readRepo(
    "packages/database/prisma/migrations/20260918150000_prod_p15_goods_receipt_draft/migration.sql",
  );
  const zod = readRepo("packages/shared-types/src/purchasing.ts");
  assert(
    schema.includes("model GoodsReceiptDraft") &&
      schema.includes("payload") &&
      schema.includes("purchaseOrderId") &&
      migration.includes("GoodsReceiptDraft"),
    "Prisma GoodsReceiptDraft + migration required",
  );
  assert(
    zod.includes("goodsReceiptDraftUpsertSchema") &&
      zod.includes("goodsReceiptDraftPayloadSchema"),
    "shared-types GRN draft contracts required",
  );
  console.log("  ✓ Prisma + Zod GoodsReceiptDraft");
}

function checkApis(): void {
  const router = readRepo("apps/server/src/modules/purchasing/purchasing.router.ts");
  const service = readRepo(
    "apps/server/src/modules/purchasing/purchasing.service.ts",
  );
  assert(
    router.includes('"/purchase-orders/:poId/receipt-draft"') &&
      router.includes("goodsReceiptDraftUpsertSchema") &&
      router.includes("getGoodsReceiptDraft") &&
      router.includes("upsertGoodsReceiptDraft") &&
      router.includes("deleteGoodsReceiptDraft"),
    "receipt-draft GET/PUT/DELETE routes required",
  );
  assert(
    service.includes("upsertGoodsReceiptDraft") &&
      service.includes("getGoodsReceiptDraft") &&
      service.includes("goodsReceiptDraft.deleteMany") &&
      !service.includes("n8n"),
    "draft service + clear on confirm required",
  );
  console.log("  ✓ OWNER receipt-draft APIs");
}

function checkWeb(): void {
  const page = readSrc("features/purchasing/ReceiveAgainstPurchaseOrderPage.tsx");
  const lib = readSrc("lib/purchaseOrders.ts");
  const addSupplier = readSrc("features/suppliers/AddSupplierPage.tsx");
  const manifest = readSrc("features/suppliers/CreateReturnManifestPage.tsx");

  assert(
    lib.includes("fetchGoodsReceiptDraft") &&
      lib.includes("saveGoodsReceiptDraft") &&
      lib.includes("/receipt-draft"),
    "purchaseOrders client must expose draft helpers",
  );
  assert(
    page.includes("handleSaveDraft") &&
      page.includes("fetchGoodsReceiptDraft") &&
      page.includes("saveGoodsReceiptDraft") &&
      page.includes("canSaveDraft") &&
      !page.includes("saveDraftSoon"),
    "Receive against PO must enable Save as Draft + resume",
  );
  assert(
    addSupplier.includes("suppliers.add.saveDraftSoon") &&
      addSupplier.includes("disabled") &&
      addSupplier.includes("suppliers.add.saveDraft"),
    "Add Supplier must keep Save as Draft disabled with hint",
  );
  assert(
    manifest.includes("suppliers.manifest.saveDraftSoon") &&
      manifest.includes("disabled"),
    "Return Manifest must keep Save as Draft disabled with hint",
  );
  console.log("  ✓ receive draft UI + policy-disabled drafts");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of P15_I18N) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }
  console.log("  ✓ draft i18n keys in en + bn-BD");
}

function checkDocs(): void {
  const catalog = readRepo("Completed_API_lists.md");
  const status = readRepo("Current_Status.md");
  const wave = readRepo("PROD_WAVE_4_PRODUCT_EXECUTION.md");
  assert(
    catalog.includes("Prod Batch P15") &&
      catalog.includes("receipt-draft"),
    "Completed_API_lists must document P15 receipt-draft",
  );
  assert(
    status.includes("P15") &&
      (status.includes("DONE") || status.includes("draft")),
    "Current_Status must reflect P15",
  );
  assert(
    wave.includes("P15") && wave.includes("PASS"),
    "PROD_WAVE_4 must mark P15 PASS",
  );
  console.log("  ✓ catalog + status + wave mention P15");
}

function main(): void {
  console.log("smoke:prod-p15 — Save as Draft GRN + policy\n");
  checkPackage();
  checkSchema();
  checkApis();
  checkWeb();
  checkI18n();
  checkDocs();
  console.log("\nPASS");
}

main();
