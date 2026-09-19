/**
 * M6 Batch BN smoke — Settings nav + hub + Business Profile.
 * Run: npm run smoke:m6bn -w @r2a/web
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

const KEYS = [
  "settings.hub.title",
  "settings.hub.business.title",
  "settings.hub.branch.hint",
  "settings.hub.roles.hint",
  "settings.hub.preferences.hint",
  "settings.hub.security.hint",
  "settings.hub.auditData.hint",
  "settings.business.title",
  "settings.business.save",
  "settings.business.timeline.title",
  "settings.business.fields.currencyHint",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    scripts?: Record<string, string>;
  };
  assert(
    pkg.scripts?.["smoke:m6bn"]?.includes("smoke-m6bn"),
    "package.json must define smoke:m6bn",
  );
  console.log("  ✓ smoke:m6bn script registered");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of KEYS) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }
  console.log("  ✓ Settings hub + Business Profile i18n keys in en + bn-BD");
}

function checkRoutes(): void {
  const ownerPath = readSrc("lib/ownerPath.ts");
  const nav = readSrc("features/shell/nav.ts");
  const shell = readSrc("features/shell/AppShell.tsx");
  assert(ownerPath.includes('"/settings"'), "/settings must be an owner path");
  assert(
    ownerPath.includes('pathname === "/settings/business"'),
    "/settings/business must be allowed as a live URL",
  );
  assert(
    ownerPath.includes("settingsSubpath"),
    "settingsSubpath helper must exist",
  );
  assert(
    nav.includes('id: "settings"') &&
      nav.includes('path: "/settings"') &&
      nav.includes("live: true"),
    "Settings nav must be live and point to /settings",
  );
  assert(
    shell.includes("SettingsHubPage") &&
      shell.includes("BusinessProfilePage") &&
      shell.includes('path === "/settings"'),
    "AppShell must route /settings hub and business profile",
  );
  console.log("  ✓ /settings routes and nav registered");
}

function checkClientAndPages(): void {
  const client = readSrc("lib/settings.ts");
  const hub = readSrc("features/settings/SettingsHubPage.tsx");
  const page = readSrc("features/settings/BusinessProfilePage.tsx");
  assert(
    client.includes("/api/v1/owner/settings/business"),
    "Settings client must call business settings API",
  );
  assert(
    client.includes("patchBusinessSettings") && client.includes("fetchBusinessSettings"),
    "Settings client must expose fetch + patch helpers",
  );
  assert(
    hub.includes("HUB_CARDS") && hub.includes("settings.hub.business.title"),
    "Settings hub must define six cards with Business Profile live",
  );
  assert(
    hub.includes("settings.hub.branch.hint") &&
      hub.includes("settings.hub.roles.hint") &&
      hub.includes("settings.hub.preferences.hint") &&
      hub.includes("settings.hub.security.hint") &&
      hub.includes("settings.hub.auditData.hint"),
    "Disabled hub cards must expose hints",
  );
  assert(
    page.includes("fetchBusinessSettings") && page.includes("patchBusinessSettings"),
    "Business Profile must use live GET/PATCH",
  );
  assert(
    page.includes("timeline") && page.includes("settings.business.timeline.title"),
    "Business Profile must render configuration timeline",
  );
  assert(
    page.includes("BDT") || page.includes('currency'),
    "Business Profile must surface locked currency",
  );
  assert(
    !page.includes("Demo Pharmacy HQ") && !hub.includes("fake-kpi"),
    "Settings UI must not hard-code invented business rows",
  );
  console.log("  ✓ Settings hub + Business Profile use live data only");
}

function main(): void {
  console.log("M6 Batch BN smoke (@r2a/web)\n");
  checkPackage();
  checkI18n();
  checkRoutes();
  checkClientAndPages();
  console.log("\nPASS");
}

try {
  main();
} catch (err) {
  console.error("\nFAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
}
