/**
 * Enhance Batch D2 smoke — Product movement report API + UI wiring.
 * Run (server must already be running):
 *   npm run smoke:enhance-d2 -w @r2a/server
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { ownerProductMovementResponseSchema } from "@r2a/shared-types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(repoRoot, ".env") });

const BASE = (process.env.BASE_URL || "http://localhost:8787").replace(
  /\/$/,
  "",
);
const API = `${BASE}/api/v1`;
const SEED = {
  ownerEmail: process.env.SEED_OWNER_EMAIL || "owner@demo.local",
  managerEmail: process.env.SEED_MANAGER_EMAIL || "manager@demo.local",
  cashierEmail: process.env.SEED_CASHIER_EMAIL || "cashier@demo.local",
  password: process.env.SEED_OWNER_PASSWORD || "ChangeMe123!",
  tenantSlug: "demo-pharmacy",
};

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];

function pass(name: string, detail = ""): void {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail = ""): void {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function req(
  pathname: string,
  opts: { method?: string; body?: unknown; token?: string } = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const response = await fetch(`${API}${pathname}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body: body as Record<string, unknown> };
}

async function login(email: string) {
  const response = await req("/auth/login", {
    method: "POST",
    body: {
      email,
      password: SEED.password,
      tenantSlug: SEED.tenantSlug,
    },
  });
  const data = asRecord(response.body.data);
  const user = asRecord(data?.user);
  return {
    status: response.status,
    body: response.body,
    token: typeof data?.accessToken === "string" ? data.accessToken : null,
    storeId: typeof user?.storeId === "string" ? user.storeId : null,
  };
}

function checkWebWiring(): void {
  const page = fs.readFileSync(
    path.join(
      repoRoot,
      "apps/web/src/features/reports/ProductMovementPage.tsx",
    ),
    "utf8",
  );
  const shell = fs.readFileSync(
    path.join(repoRoot, "apps/web/src/features/shell/AppShell.tsx"),
    "utf8",
  );
  const pathHelpers = fs.readFileSync(
    path.join(repoRoot, "apps/web/src/lib/ownerPath.ts"),
    "utf8",
  );
  const client = fs.readFileSync(
    path.join(repoRoot, "apps/web/src/lib/ownerProductMovement.ts"),
    "utf8",
  );
  const hub = fs.readFileSync(
    path.join(
      repoRoot,
      "apps/web/src/features/reports/ReportsDashboardPage.tsx",
    ),
    "utf8",
  );

  if (
    pathHelpers.includes('pathname === "/reports/product-movement"') &&
    shell.includes("ProductMovementPage") &&
    shell.includes('sub.kind === "productMovement"')
  ) {
    pass("1. /reports/product-movement route registered");
  } else {
    fail("1. /reports/product-movement route registered");
  }

  if (client.includes("/api/v1/owner/reports/product-movement")) {
    pass("2. Web client calls product-movement API");
  } else {
    fail("2. Web client calls product-movement API");
  }

  if (
    hub.includes("/reports/product-movement") &&
    page.includes("fetchProductMovement") &&
    !page.toLowerCase().includes("baki") &&
    !client.toLowerCase().includes("baki")
  ) {
    pass("3. Hub link + page wired; no Baki");
  } else {
    fail("3. Hub link + page wired; no Baki");
  }
}

async function main(): Promise<void> {
  console.log(`Enhance D2 smoke → ${API}\n`);
  checkWebWiring();

  const health = await req("/health");
  if (health.status === 200 && asRecord(health.body.data)?.ok === true) {
    pass("4. Health envelope");
  } else {
    fail("4. Health envelope", JSON.stringify(health.body));
    return finish();
  }

  const unauth = await req("/owner/reports/product-movement");
  if (unauth.status === 401) {
    pass("5. Unauthenticated product-movement is 401");
  } else {
    fail("5. Unauthenticated product-movement is 401", `status=${unauth.status}`);
  }

  const [owner, manager, cashier] = await Promise.all([
    login(SEED.ownerEmail),
    login(SEED.managerEmail),
    login(SEED.cashierEmail),
  ]);
  if (owner.status === 200 && owner.token) {
    pass("6a. Owner login", SEED.ownerEmail);
  } else {
    fail("6a. Owner login", JSON.stringify(owner.body));
    return finish();
  }
  if (manager.status === 200 && manager.token) {
    pass("6b. Manager login", SEED.managerEmail);
  } else {
    fail("6b. Manager login", JSON.stringify(manager.body));
    return finish();
  }
  if (cashier.status === 200 && cashier.token) {
    pass("6c. Cashier login", SEED.cashierEmail);
  } else {
    fail("6c. Cashier login", JSON.stringify(cashier.body));
    return finish();
  }

  const [managerReport, cashierReport] = await Promise.all([
    req("/owner/reports/product-movement", { token: manager.token }),
    req("/owner/reports/product-movement", { token: cashier.token }),
  ]);
  if (managerReport.status === 403 && cashierReport.status === 403) {
    pass("7. Manager/Cashier product-movement is 403");
  } else {
    fail(
      "7. Manager/Cashier product-movement is 403",
      JSON.stringify({
        manager: managerReport.status,
        cashier: cashierReport.status,
      }),
    );
  }

  const ownerReport = await req(
    "/owner/reports/product-movement?preset=last90",
    { token: owner.token },
  );
  const parsed = ownerProductMovementResponseSchema.safeParse(
    ownerReport.body.data,
  );
  if (ownerReport.status === 200 && parsed.success) {
    pass(
      "8. Owner response matches Zod",
      `${parsed.data.items.length} items / ${parsed.data.meta.totalRows} rows`,
    );
  } else {
    fail(
      "8. Owner response matches Zod",
      parsed.success
        ? JSON.stringify(ownerReport.body)
        : parsed.error.message,
    );
    return finish();
  }

  const data = parsed.data;
  if (data.range.preset === "last90" && data.range.spanDays === 90) {
    pass("9. Default/last90 preset spanDays=90");
  } else {
    fail(
      "9. Default/last90 preset spanDays=90",
      JSON.stringify(data.range),
    );
  }

  const bandSum =
    data.kpis.highDemandCount +
    data.kpis.steadyCount +
    data.kpis.lowSellCount +
    data.kpis.noSalesCount;
  // KPIs count the unfiltered movement set; totalRows may be filtered.
  if (bandSum >= data.meta.sellerCount) {
    pass(
      "10. Band KPI counts cover sellers + no_sales",
      `bands=${bandSum} sellers=${data.meta.sellerCount}`,
    );
  } else {
    fail(
      "10. Band KPI counts cover sellers + no_sales",
      `bands=${bandSum} sellers=${data.meta.sellerCount}`,
    );
  }

  const sellerBands = new Set(
    data.items.filter((row) => row.unitsSold > 0).map((row) => row.band),
  );
  const invalidSellerBand = data.items.some(
    (row) => row.unitsSold > 0 && row.band === "no_sales",
  );
  const idleOk = data.items.every(
    (row) =>
      row.band !== "no_sales" || (row.unitsSold === 0 && row.onHand > 0),
  );
  if (!invalidSellerBand && idleOk) {
    pass(
      "11. Band math sanity",
      `sellerBands=${[...sellerBands].join(",") || "none"}`,
    );
  } else {
    fail("11. Band math sanity");
  }

  const highOnly = await req(
    "/owner/reports/product-movement?preset=last90&band=high_demand",
    { token: owner.token },
  );
  const highParsed = ownerProductMovementResponseSchema.safeParse(
    highOnly.body.data,
  );
  if (
    highOnly.status === 200 &&
    highParsed.success &&
    highParsed.data.items.every((row) => row.band === "high_demand")
  ) {
    pass(
      "12. band=high_demand filter",
      `${highParsed.data.items.length} rows`,
    );
  } else {
    fail("12. band=high_demand filter", JSON.stringify(highOnly.body));
  }

  const last180 = await req(
    "/owner/reports/product-movement?preset=last180",
    { token: owner.token },
  );
  const last180Parsed = ownerProductMovementResponseSchema.safeParse(
    last180.body.data,
  );
  if (
    last180.status === 200 &&
    last180Parsed.success &&
    last180Parsed.data.range.preset === "last180" &&
    last180Parsed.data.range.spanDays === 180
  ) {
    pass("13. last180 preset");
  } else {
    fail("13. last180 preset", JSON.stringify(last180.body));
  }

  const badRange = await req(
    "/owner/reports/product-movement?from=2026-02-01&to=2026-01-01",
    { token: owner.token },
  );
  if (badRange.status === 400) {
    pass("14. Invalid date range is 400");
  } else {
    fail("14. Invalid date range is 400", `status=${badRange.status}`);
  }

  finish();
}

function finish(): void {
  const failed = results.filter((result) => !result.ok);
  console.log(
    `\nEnhance D2 smoke summary: ${results.length - failed.length}/${results.length} passed`,
  );
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
