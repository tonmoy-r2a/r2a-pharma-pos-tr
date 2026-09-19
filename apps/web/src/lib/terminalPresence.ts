import { apiRequestEnvelope } from "./api";

export type TerminalPresenceStatus = "ONLINE" | "OFFLINE" | "FORCED_OFFLINE";

export type TerminalPresenceRow = {
  id: string;
  tenantId: string;
  storeId: string;
  terminalId: string;
  userId: string;
  userName: string;
  userRole: string;
  lastSeenAt: string;
  forceOffline: boolean;
  userAgent?: string | null;
  status: TerminalPresenceStatus;
};

/** Prod P11 — Owner list of reported terminals (no invented rows). */
export async function fetchTerminalPresence(): Promise<TerminalPresenceRow[]> {
  const { data } = await apiRequestEnvelope<{ items: TerminalPresenceRow[] }>(
    "/api/v1/owner/terminals/presence",
  );
  const items = data && typeof data === "object" && Array.isArray(data.items) ? data.items : [];
  return items;
}
