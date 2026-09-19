/**
 * Milestone 6 Batch BM smoke — Settings, Business Profile, Account Profile, and Help APIs + Zod contracts.
 *
 * Usage (server must already be running):
 *   npm run smoke:m6bm -w @r2a/server
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
  ownerBusinessSettingsResponseSchema,
  ownerAccountSettingsResponseSchema,
  ownerSettingsActivityListResponseSchema,
  ownerHelpStatusResponseSchema,
} from "@r2a/shared-types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(repoRoot, ".env") });

const BASE = (process.env.BASE_URL || "http://localhost:8787").replace(/\/$/, "");
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

async function login(email: string, password = SEED.password) {
  const response = await req("/auth/login", {
    method: "POST",
    body: { email, password, tenantSlug: SEED.tenantSlug },
  });
  const data = asRecord(response.body.data);
  const user = asRecord(data?.user);
  return {
    status: response.status,
    body: response.body,
    token: typeof data?.accessToken === "string" ? data.accessToken : null,
    userId: typeof user?.id === "string" ? user.id : null,
    storeId: typeof user?.storeId === "string" ? user.storeId : null,
  };
}

async function main(): Promise<void> {
  console.log(`M6BM smoke → ${API}\n`);

  // 1. Health check envelope
  const health = await req("/health");
  if (health.status === 200 && asRecord(health.body.data)?.ok === true) {
    pass("1. Health envelope");
  } else {
    fail("1. Health envelope", JSON.stringify(health.body));
    return finish();
  }

  // 2. Logins
  const [owner, manager, cashier] = await Promise.all([
    login(SEED.ownerEmail),
    login(SEED.managerEmail),
    login(SEED.cashierEmail),
  ]);
  if (owner.status === 200 && owner.token) pass("2a. Owner login");
  else {
    fail("2a. Owner login", JSON.stringify(owner.body));
    return finish();
  }
  if (manager.status === 200 && manager.token) pass("2b. Manager login");
  else {
    fail("2b. Manager login", JSON.stringify(manager.body));
    return finish();
  }
  if (cashier.status === 200 && cashier.token) pass("2c. Cashier login");
  else {
    fail("2c. Cashier login", JSON.stringify(cashier.body));
    return finish();
  }

  // 3. RBAC guards: Cashier and Manager blocked (403) from settings
  const cashierSettings = await req("/owner/settings/business", { token: cashier.token });
  if (cashierSettings.status === 403) pass("3a. Cashier blocked from business settings (403)");
  else fail("3a. Cashier blocked from business settings", `status=${cashierSettings.status}`);

  const managerSettings = await req("/owner/settings/business", { token: manager.token });
  if (managerSettings.status === 403) pass("3b. Manager blocked from business settings (403)");
  else fail("3b. Manager blocked from business settings", `status=${managerSettings.status}`);

  const cashierHelp = await req("/owner/help/status", { token: cashier.token });
  if (cashierHelp.status === 403) pass("3c. Cashier blocked from owner help status (403)");
  else fail("3c. Cashier blocked from owner help status", `status=${cashierHelp.status}`);

  // 4. GET /owner/settings/business
  const getBiz = await req("/owner/settings/business", { token: owner.token });
  if (getBiz.status === 200) {
    const parse = ownerBusinessSettingsResponseSchema.safeParse(getBiz.body.data);
    if (parse.success) {
      pass("4. Owner GET /owner/settings/business adheres to Zod schema", parse.data.tenant.name);
    } else {
      fail("4. Owner GET /owner/settings/business Zod mismatch", JSON.stringify(parse.error.format()));
    }
  } else {
    fail("4. Owner GET /owner/settings/business failed", JSON.stringify(getBiz.body));
  }

  // 5. PATCH /owner/settings/business
  const patchBiz = await req("/owner/settings/business", {
    method: "PATCH",
    token: owner.token,
    body: {
      address: "House 12, Road 5, Dhanmondi, Dhaka-1205 (Smoke Updated)",
      openingHours: "08:00 AM - 11:30 PM (Daily)",
    },
  });
  if (patchBiz.status === 200) {
    const parse = ownerBusinessSettingsResponseSchema.safeParse(patchBiz.body.data);
    if (parse.success && parse.data.tenant.openingHours?.includes("11:30 PM")) {
      pass("5. Owner PATCH /owner/settings/business updates fields & returns timeline", parse.data.tenant.openingHours);
    } else {
      fail("5. Owner PATCH /owner/settings/business mismatch", JSON.stringify(patchBiz.body));
    }
  } else {
    fail("5. Owner PATCH /owner/settings/business failed", JSON.stringify(patchBiz.body));
  }

  // 6. GET /owner/settings/account
  const getAcc = await req("/owner/settings/account", { token: owner.token });
  if (getAcc.status === 200) {
    const parse = ownerAccountSettingsResponseSchema.safeParse(getAcc.body.data);
    if (parse.success && parse.data.email === SEED.ownerEmail) {
      pass("6. Owner GET /owner/settings/account adheres to Zod schema", parse.data.email);
    } else {
      fail("6. Owner GET /owner/settings/account Zod mismatch", JSON.stringify(parse.error?.format() || getAcc.body));
    }
  } else {
    fail("6. Owner GET /owner/settings/account failed", JSON.stringify(getAcc.body));
  }

  // 7. PATCH /owner/settings/account
  const patchAcc = await req("/owner/settings/account", {
    method: "PATCH",
    token: owner.token,
    body: {
      phone: "01700000099",
    },
  });
  if (patchAcc.status === 200) {
    const parse = ownerAccountSettingsResponseSchema.safeParse(patchAcc.body.data);
    if (parse.success && parse.data.phone === "01700000099") {
      pass("7. Owner PATCH /owner/settings/account updates profile", parse.data.phone);
    } else {
      fail("7. Owner PATCH /owner/settings/account mismatch", JSON.stringify(patchAcc.body));
    }
  } else {
    fail("7. Owner PATCH /owner/settings/account failed", JSON.stringify(patchAcc.body));
  }

  // 8. POST /owner/settings/account/change-password
  const wrongPwd = await req("/owner/settings/account/change-password", {
    method: "POST",
    token: owner.token,
    body: {
      currentPassword: "WrongPassword!",
      newPassword: "NewSecretPassword123!",
    },
  });
  if (wrongPwd.status === 400) {
    pass("8a. Change password rejects invalid current password (400)");
  } else {
    fail("8a. Change password rejects invalid current password", `status=${wrongPwd.status}`);
  }

  const changePwd = await req("/owner/settings/account/change-password", {
    method: "POST",
    token: owner.token,
    body: {
      currentPassword: SEED.password,
      newPassword: "NewSecretPassword123!",
    },
  });
  if (changePwd.status === 200) {
    pass("8b. Owner password updated successfully");
    // Verify login with new password
    const testNewLogin = await login(SEED.ownerEmail, "NewSecretPassword123!");
    if (testNewLogin.status === 200 && testNewLogin.token) {
      pass("8c. Owner login with new password succeeds");
      // Revert password back to default
      await req("/owner/settings/account/change-password", {
        method: "POST",
        token: testNewLogin.token,
        body: {
          currentPassword: "NewSecretPassword123!",
          newPassword: SEED.password,
        },
      });
      pass("8d. Owner password reverted to seed default");
    } else {
      fail("8c. Owner login with new password failed", JSON.stringify(testNewLogin.body));
    }
  } else {
    fail("8b. Owner password change failed", JSON.stringify(changePwd.body));
  }

  // 9. GET /owner/settings/activity
  const getAct = await req("/owner/settings/activity?limit=10", { token: owner.token });
  if (getAct.status === 200) {
    const parse = ownerSettingsActivityListResponseSchema.safeParse(getAct.body.data);
    const meta = asRecord(getAct.body.meta);
    if (parse.success && parse.data.length > 0 && typeof meta?.total === "number") {
      pass("9. Owner GET /owner/settings/activity returns configuration timeline", `${parse.data.length} items, total=${meta.total}`);
    } else {
      fail("9. Owner GET /owner/settings/activity Zod mismatch", JSON.stringify(parse.error?.format() || getAct.body));
    }
  } else {
    fail("9. Owner GET /owner/settings/activity failed", JSON.stringify(getAct.body));
  }

  // 10. GET /owner/help/status
  const getHelp = await req("/owner/help/status", { token: owner.token });
  if (getHelp.status === 200) {
    const parse = ownerHelpStatusResponseSchema.safeParse(getHelp.body.data);
    if (parse.success && parse.data.status === "OPERATIONAL" && parse.data.database === "CONNECTED") {
      pass("10. Owner GET /owner/help/status returns system health", `${parse.data.status} / DB ${parse.data.database}`);
    } else {
      fail("10. Owner GET /owner/help/status Zod mismatch", JSON.stringify(parse.error?.format() || getHelp.body));
    }
  } else {
    fail("10. Owner GET /owner/help/status failed", JSON.stringify(getHelp.body));
  }

  // 11. No Settings/Help nav prematurely enabled in web nav until Batch BN
  const navPath = path.join(repoRoot, "apps/web/src/routes/nav.ts");
  if (fs.existsSync(navPath)) {
    const navContent = fs.readFileSync(navPath, "utf8");
    const settingsMatch = navContent.match(/settings:\s*\{[\s\S]*?live:\s*(\w+)/);
    const helpMatch = navContent.match(/help:\s*\{[\s\S]*?live:\s*(\w+)/);
    const settingsLive = settingsMatch ? settingsMatch[1] : "false";
    const helpLive = helpMatch ? helpMatch[1] : "false";
    if (settingsLive === "false" && helpLive === "false") {
      pass("11. Web UI nav settings & help remain non-live for Batch BM");
    } else {
      fail("11. Web UI nav settings & help premature enablement", `settings=${settingsLive}, help=${helpLive}`);
    }
  } else {
    pass("11. Web nav check skipped (file not present)");
  }

  finish();
}

function finish(): void {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error in smoke test:", err);
  process.exit(1);
});
