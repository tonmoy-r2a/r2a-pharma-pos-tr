import { Router } from "express";
import { terminalHeartbeatSchema } from "@r2a/shared-types";
import { restrictTo } from "../../middlewares/protect";
import { validate } from "../../middlewares/validate";
import * as terminalController from "./terminal.controller";

/**
 * Prod P11 — desktop terminal heartbeat.
 * Mounted at /api/v1/terminals (JWT + tenantContext already applied).
 */
const terminalRouter = Router();

terminalRouter.post(
  "/heartbeat",
  restrictTo("CASHIER", "MANAGER", "OWNER"),
  validate({ body: terminalHeartbeatSchema }),
  terminalController.heartbeat,
);

export default terminalRouter;

/**
 * Owner presence list — mounted under ownerRouter at /terminals/presence.
 */
export const ownerTerminalPresenceRouter = Router({ mergeParams: true });

ownerTerminalPresenceRouter.get(
  "/presence",
  terminalController.listPresence,
);
