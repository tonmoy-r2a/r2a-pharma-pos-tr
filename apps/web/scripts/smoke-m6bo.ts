/**
 * M6 Batch BO smoke — Account Profile + footer Owner Profile.
 * Run: npm run smoke:m6bo -w @r2a/web
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
  "settings.account.title",
  "settings.account.save",
  "settings.account.password.submit",
  "settings.account.disabled.twoFactor.hint",
  "settings.account.disabled.sessions.hint",
  "settings.account.disabled.notifications.hint",
  "settings.account.activity.title",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    scripts?: Record<string, string>;
  };
  assert(
    pkg.scripts?.["smoke:m6bo"]?.includes("smoke-m6bo"),
    "package.json must define smoke:m6bo",
  );
  console.log("  ✓ smoke:m6bo script registered");
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
  console.log("  ✓ Account Profile i18n keys in en + bn-BD");
}

function checkRoutes(): void {
  const ownerPath = readSrc("lib/ownerPath.ts");
  const nav = readSrc("features/shell/nav.ts");
  const shell = readSrc("features/shell/AppShell.tsx");
  const sidebar = readSrc("features/shell/Sidebar.tsx");
  assert(
    ownerPath.includes('pathname === "/settings/account"'),
    "/settings/account must be allowed as a live URL",
  );
  assert(
    ownerPath.includes('kind: "account"') ||
      ownerPath.includes('return { kind: "account" }'),
    "settingsSubpath must recognize account",
  );
  assert(
    nav.includes('id: "ownerProfile"') &&
      nav.includes('path: "/settings/account"') &&
      nav.includes("live: true"),
    "Footer Owner Profile must be live and point to /settings/account",
  );
  assert(
    shell.includes("AccountProfilePage") &&
      shell.includes('sub.kind === "account"'),
    "AppShell must route /settings/account to AccountProfilePage",
  );
  assert(
    sidebar.includes("pathname === item.path"),
    "Sidebar footer must navigate live Owner Profile",
  );
  console.log("  ✓ /settings/account route + footer Owner Profile registered");
}

function checkClientAndPage(): void {
  const client = readSrc("lib/settings.ts");
  const page = readSrc("features/settings/AccountProfilePage.tsx");
  assert(
    client.includes("/api/v1/owner/settings/account") &&
      client.includes("change-password"),
    "Settings client must call account + change-password APIs",
  );
  assert(
    page.includes("fetchAccountSettings") &&
      page.includes("patchAccountSettings") &&
      page.includes("changeOwnerPassword"),
    "Account Profile must use live account APIs",
  );
  assert(
    page.includes("recentActivity") &&
      page.includes("settings.account.activity.title"),
    "Account Profile must render activity timeline",
  );
  assert(
    page.includes("settings.account.disabled.twoFactor.hint") &&
      page.includes("settings.account.disabled.sessions.hint") &&
      page.includes("settings.account.disabled.notifications.hint"),
    "2FA / sessions / notifications must stay disabled with hints",
  );
  assert(
    !page.includes("owner@example.com") && !page.includes("fake-session"),
    "Account Profile must not hard-code invented account rows",
  );
  console.log("  ✓ Account Profile uses live data; disabled controls have hints");
}

function main(): void {
  console.log("M6 Batch BO smoke (@r2a/web)\n");
  checkPackage();
  checkI18n();
  checkRoutes();
  checkClientAndPage();
  console.log("\nPASS");
}

try {
  main();
} catch (err) {
  console.error("\nFAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
}
