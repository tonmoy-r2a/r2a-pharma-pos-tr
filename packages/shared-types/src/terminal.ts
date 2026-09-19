import { z } from "zod";

/** Computed presence for Owner UI (Prod P11). */
export const terminalPresenceStatusSchema = z.enum([
  "ONLINE",
  "OFFLINE",
  "FORCED_OFFLINE",
]);
export type TerminalPresenceStatus = z.infer<typeof terminalPresenceStatusSchema>;

/**
 * Desktop heartbeat body.
 * Lock: continue posting while Force Offline with `forceOffline: true`
 * so Owner can show Forced Offline (not silent offline).
 */
export const terminalHeartbeatSchema = z.object({
  terminalId: z.string().trim().min(1).max(128),
  forceOffline: z.boolean().optional().default(false),
  userAgent: z.string().trim().max(512).optional(),
});
export type TerminalHeartbeatInput = z.infer<typeof terminalHeartbeatSchema>;

/** Single presence row returned to Owner web. */
export const ownerTerminalPresenceRowSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  storeId: z.string(),
  terminalId: z.string(),
  userId: z.string(),
  userName: z.string(),
  userRole: z.string(),
  lastSeenAt: z.coerce.date(),
  forceOffline: z.boolean(),
  userAgent: z.string().nullable().optional(),
  status: terminalPresenceStatusSchema,
});
export type OwnerTerminalPresenceRow = z.infer<typeof ownerTerminalPresenceRowSchema>;

/** Stale threshold (ms) — desktop heartbeats every ~20s; 45s = offline. */
export const TERMINAL_PRESENCE_STALE_MS = 45_000;
