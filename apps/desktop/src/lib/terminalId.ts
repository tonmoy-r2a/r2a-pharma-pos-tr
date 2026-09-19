/**
 * Stable per-install terminal id for presence heartbeats (Prod P11).
 * Key: pharmasync.terminalId
 */

const KEY = "pharmasync.terminalId";

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `term-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateTerminalId(): string {
  try {
    const existing = localStorage.getItem(KEY)?.trim();
    if (existing) return existing;
    const next = randomId();
    localStorage.setItem(KEY, next);
    return next;
  } catch {
    return randomId();
  }
}
