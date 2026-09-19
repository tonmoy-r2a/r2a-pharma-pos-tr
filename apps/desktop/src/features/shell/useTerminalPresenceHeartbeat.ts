import { useEffect, useRef } from "react";
import { useAuth } from "@/features/auth";
import { useConnectivity } from "@/features/shell";
import {
  postTerminalHeartbeat,
  TERMINAL_HEARTBEAT_MS,
} from "@/lib/terminalPresence";

/**
 * Prod P11 — fire presence heartbeats while authenticated.
 * Lock: keep beating during Force Offline with forceOffline: true.
 * Failures are logged (still best-effort for Owner UI).
 */
export function useTerminalPresenceHeartbeat(): void {
  const { status, user } = useAuth();
  const { forcedOffline } = useConnectivity();
  const forcedRef = useRef(forcedOffline);
  forcedRef.current = forcedOffline;

  useEffect(() => {
    if (status !== "authenticated" || !user?.id || !user.tenantId) return;
    // Heartbeat needs JWT store scope (cashier/manager seed users have storeId).
    if (!user.storeId) {
      console.warn(
        "[presence] skip heartbeat — session has no storeId",
        user.email,
      );
      return;
    }

    let cancelled = false;

    const tick = () => {
      void postTerminalHeartbeat(forcedRef.current).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[presence] heartbeat failed:", msg);
      });
    };

    // Immediate + short follow-up so Owner UI lights up without waiting 20s.
    tick();
    const kick = window.setTimeout(tick, 2_000);
    const id = window.setInterval(() => {
      if (cancelled) return;
      tick();
    }, TERMINAL_HEARTBEAT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(kick);
      window.clearInterval(id);
    };
  }, [status, user?.id, user?.tenantId, user?.storeId, user?.email]);

  // Re-announce immediately when Force Offline toggles.
  useEffect(() => {
    if (status !== "authenticated" || !user?.storeId) return;
    void postTerminalHeartbeat(forcedOffline).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[presence] heartbeat (force toggle) failed:", msg);
    });
  }, [forcedOffline, status, user?.storeId]);
}
