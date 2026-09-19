import type { Request, Response } from "express";
import type { TerminalHeartbeatInput } from "@r2a/shared-types";
import { catchAsync, sendResponse } from "../../utils";
import { requireTenantContext } from "../../utils/tenant";
import * as terminalService from "./terminal.service";

export const heartbeat = catchAsync(async (req: Request, res: Response) => {
  const ctx = requireTenantContext(req);
  const data = await terminalService.heartbeat(
    ctx,
    req.body as TerminalHeartbeatInput,
  );
  sendResponse(res, { statusCode: 200, message: "OK", data });
});

export const listPresence = catchAsync(async (req: Request, res: Response) => {
  const ctx = requireTenantContext(req);
  const items = await terminalService.listPresence(ctx);
  sendResponse(res, {
    statusCode: 200,
    message: "OK",
    data: { items },
  });
});
