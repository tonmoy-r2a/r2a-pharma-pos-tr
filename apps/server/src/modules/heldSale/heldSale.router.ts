import { Router } from "express";
import {
  heldSaleCreateSchema,
  heldSaleIdParamSchema,
} from "@r2a/shared-types";
import { restrictTo } from "../../middlewares/protect";
import { validate } from "../../middlewares/validate";
import * as heldSaleController from "./heldSale.controller";

/**
 * Prod P12 — soft held sales (cashier JWT; store-scoped).
 * Mounted at /api/v1/held-sales.
 * Soft hold only — no stock reservation.
 */
const heldSaleRouter = Router();

heldSaleRouter.post(
  "/",
  restrictTo("CASHIER", "MANAGER", "OWNER"),
  validate({ body: heldSaleCreateSchema }),
  heldSaleController.create,
);

heldSaleRouter.get(
  "/",
  restrictTo("CASHIER", "MANAGER", "OWNER"),
  heldSaleController.list,
);

heldSaleRouter.get(
  "/:heldSaleId",
  restrictTo("CASHIER", "MANAGER", "OWNER"),
  validate({ params: heldSaleIdParamSchema }),
  heldSaleController.get,
);

heldSaleRouter.post(
  "/:heldSaleId/discard",
  restrictTo("CASHIER", "MANAGER", "OWNER"),
  validate({ params: heldSaleIdParamSchema }),
  heldSaleController.discard,
);

heldSaleRouter.post(
  "/:heldSaleId/resume-ack",
  restrictTo("CASHIER", "MANAGER", "OWNER"),
  validate({ params: heldSaleIdParamSchema }),
  heldSaleController.resumeAck,
);

export default heldSaleRouter;
