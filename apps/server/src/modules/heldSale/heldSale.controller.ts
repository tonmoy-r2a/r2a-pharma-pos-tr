import type { Request, Response } from "express";
import type { HeldSaleCreateInput } from "@r2a/shared-types";
import { catchAsync, sendResponse } from "../../utils";
import { requireTenantContext } from "../../utils/tenant";
import * as heldSaleService from "./heldSale.service";

export const create = catchAsync(async (req: Request, res: Response) => {
  const ctx = requireTenantContext(req);
  const data = await heldSaleService.createHeldSale(
    ctx,
    req.body as HeldSaleCreateInput,
  );
  sendResponse(res, { statusCode: 201, message: "Held sale created", data });
});

export const list = catchAsync(async (req: Request, res: Response) => {
  const ctx = requireTenantContext(req);
  const items = await heldSaleService.listHeldSales(ctx);
  sendResponse(res, {
    statusCode: 200,
    message: "OK",
    data: { items },
  });
});

export const get = catchAsync(async (req: Request, res: Response) => {
  const ctx = requireTenantContext(req);
  const data = await heldSaleService.getHeldSale(
    ctx,
    String(req.params.heldSaleId),
  );
  sendResponse(res, { statusCode: 200, message: "OK", data });
});

export const discard = catchAsync(async (req: Request, res: Response) => {
  const ctx = requireTenantContext(req);
  const data = await heldSaleService.discardHeldSale(
    ctx,
    String(req.params.heldSaleId),
  );
  sendResponse(res, { statusCode: 200, message: "Held sale discarded", data });
});

export const resumeAck = catchAsync(async (req: Request, res: Response) => {
  const ctx = requireTenantContext(req);
  const data = await heldSaleService.resumeAckHeldSale(
    ctx,
    String(req.params.heldSaleId),
  );
  sendResponse(res, {
    statusCode: 200,
    message: "Held sale resumed",
    data,
  });
});
