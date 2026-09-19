/**
 * Prod Batch P10 smoke — Request Cash Count.
 * Run: npm run smoke:prod-p10 -w @r2a/web
 *
 * Source guards only (no live API). Covers:
 * - Prisma cash-count fields + activity enums
 * - OWNER POST cash-count-request (+ cancel)
 * - Owner web Shift list/detail enable + modal
 * - Desktop poll/banner + close-shift path
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

const P10_WEB_I18N = [
  "shifts.cashCount.title",
  "shifts.cashCount.confirm",
  "shifts.cashCount.cancelRequest",
  "shifts.cashCount.manageRequest",
  "shifts.detail.activity.CASH_COUNT_REQUESTED",
  "shifts.detail.activity.CASH_COUNT_CANCELLED",
] as const;

const P10_DESKTOP_I18N = [
  "shift.cashCount.bannerTitle",
  "shift.cashCount.bannerBody",
  "shift.cashCount.openShiftPanel",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/web", `package name must be @r2a/web, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:prod-p10"]?.includes("smoke-prod-p10"),
    "package.json must define smoke:prod-p10",
  );
  console.log("  ✓ package @r2a/web + smoke:prod-p10");
}

function checkSchemaAndZod(): void {
  const schema = readRepo("packages/database/prisma/schema.prisma");
  const migration = readRepo(
    "packages/database/prisma/migrations/20260918120000_prod_p10_cash_count_request/migration.sql",
  );
  const enums = readRepo("packages/shared-types/src/enums.ts");
  const shiftZod = readRepo("packages/shared-types/src/shift.ts");

  assert(
    schema.includes("enum CashCountRequestStatus") &&
      schema.includes("cashCountStatus") &&
      schema.includes("cashCountRequestedAt") &&
      schema.includes("cashCountRequestedByUserId") &&
      schema.includes("CASH_COUNT_REQUESTED") &&
      schema.includes("CASH_COUNT_CANCELLED"),
    "Prisma Shift must include cash-count fields + activity enums",
  );
  assert(
    migration.includes("CashCountRequestStatus") &&
      migration.includes("cashCountStatus"),
    "P10 migration must add cash-count columns",
  );
  assert(
    enums.includes("cashCountRequestStatusSchema") &&
      enums.includes("CASH_COUNT_REQUESTED"),
    "shared-types enums must mirror cash-count statuses",
  );
  assert(
    shiftZod.includes("shiftCashCountRequestSchema") &&
      shiftZod.includes("cashCountStatus"),
    "shared-types shift Zod must include request schema + fields",
  );
  console.log("  ✓ Prisma + Zod cash-count contracts");
}

function checkServerRoutes(): void {
  const router = readRepo("apps/server/src/modules/shift/shift.router.ts");
  const service = readRepo("apps/server/src/modules/shift/shift.service.ts");
  const controller = readRepo("apps/server/src/modules/shift/shift.controller.ts");

  assert(
    router.includes('"/:shiftId/cash-count-request"') &&
      router.includes('"/:shiftId/cash-count-request/cancel"') &&
      router.includes("shiftCashCountRequestSchema"),
    "owner shift router must mount cash-count-request (+ cancel)",
  );
  assert(
    service.includes("requestCashCount") &&
      service.includes("cancelCashCountRequest") &&
      service.includes('cashCountStatus === "REQUESTED"') &&
      service.includes('cashCountStatus: "COMPLETED"'),
    "shift service must request/cancel and complete on close",
  );
  assert(
    controller.includes("requestCashCount") && controller.includes("cancelCashCount"),
    "shift controller must expose request + cancel handlers",
  );
  console.log("  ✓ OWNER cash-count APIs + close completes request");
}

function checkWebUi(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of P10_WEB_I18N) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }

  const lib = readSrc("lib/shifts.ts");
  const modal = readSrc("features/staff/RequestCashCountModal.tsx");
  const list = readSrc("features/staff/ShiftManagementPage.tsx");
  const detail = readSrc("features/staff/ShiftDetailPage.tsx");

  assert(
    lib.includes("requestCashCount") &&
      lib.includes("cancelCashCountRequest") &&
      lib.includes("/cash-count-request"),
    "web shifts lib must POST cash-count-request (+ cancel)",
  );
  assert(
    modal.includes("requestCashCount") && modal.includes("cancelCashCountRequest"),
    "RequestCashCountModal must call request + cancel",
  );
  assert(
    list.includes("RequestCashCountModal") &&
      list.includes("setCashCountOpen(true)") &&
      !list.includes('disabled\n            title={t("shifts.disabled.requestCashCountHint")}'),
    "Shift Management Request Cash Count must be enabled",
  );
  assert(
    detail.includes("RequestCashCountModal") &&
      detail.includes('detail.status === "OPEN"') &&
      !detail.includes('disabled title={t("shifts.disabled.requestCashCountHint")}'),
    "Shift Details Request Cash Count must be enabled for OPEN",
  );
  console.log("  ✓ Owner web Request Cash Count UI + i18n");
}

function checkDesktop(): void {
  const en = readRepo("apps/desktop/src/i18n/locales/en.ts");
  const bn = readRepo("apps/desktop/src/i18n/locales/bn-BD.ts");
  for (const key of P10_DESKTOP_I18N) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `desktop ${key} must exist in en and bn-BD`,
    );
  }

  const store = readRepo("apps/desktop/src/lib/shiftStore.ts");
  const panel = readRepo("apps/desktop/src/features/shift/ShiftPanel.tsx");
  const counter = readRepo("apps/desktop/src/features/counter/CounterReadyScreen.tsx");
  const app = readRepo("apps/desktop/src/App.tsx");

  assert(
    store.includes("cashCountRequested") &&
      store.includes('cashCountStatus === "REQUESTED"') &&
      store.includes("refreshCashCountFlag"),
    "desktop shiftStore must cache + poll cash-count flag",
  );
  assert(
    panel.includes("shift.cashCount.bannerTitle") &&
      panel.includes("refreshCashCountFlag"),
    "ShiftPanel must show cash-count banner and poll",
  );
  assert(
    counter.includes("cashCountRequested") &&
      counter.includes("onOpenShift") &&
      counter.includes("refreshCashCountFlag"),
    "Counter Ready must banner + open Shift panel",
  );
  assert(
    app.includes("onOpenShift=") && app.includes("setShiftOpen(true)"),
    "App must wire Counter Ready onOpenShift to Shift panel",
  );
  console.log("  ✓ Desktop cash-count banner + poll");
}

function main(): void {
  console.log("\nProd Batch P10 smoke — Request Cash Count\n");
  checkPackage();
  checkSchemaAndZod();
  checkServerRoutes();
  checkWebUi();
  checkDesktop();
  console.log("\nAll P10 checks passed.\n");
}

main();
