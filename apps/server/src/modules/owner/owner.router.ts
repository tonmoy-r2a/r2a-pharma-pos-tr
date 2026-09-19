import { Router } from "express";
import {
  customerIdParamSchema,
  idParamSchema,
  ownerCustomerApproveSchema,
  ownerCustomerListQuerySchema,
  ownerCustomerRejectSchema,
  ownerDashboardQuerySchema,
  ownerExpiryQuerySchema,
  ownerInventoryQuerySchema,
  ownerProductMovementQuerySchema,
  ownerStockPriorityQuerySchema,
  ownerSalesReportQuerySchema,
  productIdParamSchema,
  staffListQuerySchema,
  ownerStaffCreateSchema,
  ownerStaffPatchSchema,
  staffDeactivateSchema,
  ownerBusinessSettingsPatchSchema,
  ownerAccountSettingsPatchSchema,
  ownerChangePasswordSchema,
  ownerSettingsActivityQuerySchema,
  catalogImportUploadSchema,
  catalogImportCommitSchema,
} from "@r2a/shared-types";
import { restrictTo } from "../../middlewares/protect";
import { validate } from "../../middlewares/validate";
import * as ownerController from "./owner.controller";
import * as customerController from "../customer/customer.controller";
import purchasingRouter from "../purchasing/purchasing.router";
import { ownerShiftRouter } from "../shift/shift.router";
import { ownerAuditRouter } from "../audit/audit.router";
import { ownerTerminalPresenceRouter } from "../terminal/terminal.router";

/**
 * Owner aggregate reads — dashboard / inventory-summary / expiry / inventory list
 * / product detail. All are OWNER-only (Manager/Cashier 403).
 */
const ownerRouter = Router();

ownerRouter.use(restrictTo("OWNER"));

ownerRouter.use(purchasingRouter);
ownerRouter.use(ownerAuditRouter);

ownerRouter.get(
  "/dashboard",
  validate({ query: ownerDashboardQuerySchema }),
  ownerController.dashboard,
);

ownerRouter.get(
  "/reports/sales",
  validate({ query: ownerSalesReportQuerySchema }),
  ownerController.salesReport,
);

ownerRouter.get(
  "/reports/product-movement",
  validate({ query: ownerProductMovementQuerySchema }),
  ownerController.productMovementReport,
);

ownerRouter.get(
  "/reports/stock-priority",
  validate({ query: ownerStockPriorityQuerySchema }),
  ownerController.stockPriorityReport,
);

ownerRouter.get("/inventory-summary", ownerController.inventorySummary);

ownerRouter.get(
  "/inventory",
  validate({ query: ownerInventoryQuerySchema }),
  ownerController.inventory,
);

ownerRouter.get(
  "/products/:productId",
  validate({ params: productIdParamSchema }),
  ownerController.productDetail,
);

ownerRouter.get(
  "/batches/:id",
  validate({ params: idParamSchema }),
  ownerController.batchDetail,
);

ownerRouter.get(
  "/expiry",
  validate({ query: ownerExpiryQuerySchema }),
  ownerController.expiry,
);

/** Owner customer management — all OWNER-only. */
ownerRouter.get(
  "/customers",
  validate({ query: ownerCustomerListQuerySchema }),
  customerController.ownerList,
);

ownerRouter.get(
  "/customers/:customerId",
  validate({ params: customerIdParamSchema }),
  customerController.ownerDetail,
);

ownerRouter.post(
  "/customers/:customerId/approve",
  validate({ params: customerIdParamSchema, body: ownerCustomerApproveSchema }),
  customerController.ownerApprove,
);

ownerRouter.post(
  "/customers/:customerId/reject",
  validate({ params: customerIdParamSchema, body: ownerCustomerRejectSchema }),
  customerController.ownerReject,
);

/** Owner staff management — all OWNER-only. */
ownerRouter.get(
  "/users",
  validate({ query: staffListQuerySchema }),
  ownerController.listStaff,
);

ownerRouter.get(
  "/users/:id",
  validate({ params: idParamSchema }),
  ownerController.getStaff,
);

ownerRouter.post(
  "/users",
  validate({ body: ownerStaffCreateSchema }),
  ownerController.createStaff,
);


ownerRouter.patch(
  "/users/:id",
  validate({ params: idParamSchema, body: ownerStaffPatchSchema }),
  ownerController.patchStaff,
);

ownerRouter.post(
  "/users/:id/deactivate",
  validate({ params: idParamSchema, body: staffDeactivateSchema }),
  ownerController.deactivateStaff,
);

ownerRouter.post(
  "/users/:id/reactivate",
  validate({ params: idParamSchema }),
  ownerController.reactivateStaff,
);

/** Owner shift management — list, detail, resolve-variance. */
ownerRouter.use("/shifts", ownerShiftRouter);

/** Prod P11 — terminal presence for Dashboard dots. */
ownerRouter.use("/terminals", ownerTerminalPresenceRouter);

/** Owner settings & business profile management (M6 Slice 8). */
ownerRouter.get("/settings/business", ownerController.getBusinessSettings);
ownerRouter.patch(
  "/settings/business",
  validate({ body: ownerBusinessSettingsPatchSchema }),
  ownerController.patchBusinessSettings,
);
ownerRouter.get("/settings/account", ownerController.getAccountSettings);
ownerRouter.patch(
  "/settings/account",
  validate({ body: ownerAccountSettingsPatchSchema }),
  ownerController.patchAccountSettings,
);
ownerRouter.post(
  "/settings/account/change-password",
  validate({ body: ownerChangePasswordSchema }),
  ownerController.changePassword,
);
ownerRouter.get(
  "/settings/activity",
  validate({ query: ownerSettingsActivityQuerySchema }),
  ownerController.getSettingsActivity,
);

/** Owner Help & Support status (M6 Slice 8). */
ownerRouter.get("/help/status", ownerController.getHelpStatus);

ownerRouter.post(
  "/catalog/import/dry-run",
  validate({ body: catalogImportUploadSchema }),
  ownerController.catalogImportDryRun,
);

ownerRouter.post(
  "/catalog/import/commit",
  validate({ body: catalogImportCommitSchema }),
  ownerController.catalogImportCommit,
);

export default ownerRouter;
