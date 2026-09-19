/**
 * Prod P11 — desktop terminal presence heartbeat.
 * Continues while Force Offline with forceOffline: true (Owner sees Forced Offline).
 * Stops when session ends.
 */

import { apiRequest } from "@/lib/api";
import { getOrCreateTerminalId } from "@/lib/terminalId";

export const TERMINAL_HEARTBEAT_MS = 20_000;

export async function postTerminalHeartbeat(forceOffline: boolean): Promise<void> {
  const terminalId = getOrCreateTerminalId();
  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 512) : undefined;
  await apiRequest("/api/v1/terminals/heartbeat", {
    method: "POST",
    body: {
      terminalId,
      forceOffline,
      userAgent,
    },
  });
}
