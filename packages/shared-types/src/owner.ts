import { z } from "zod";

/**
 * Owner-web query DTOs (wired in M6 Batch F).
 */

export const ownerDashboardQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type OwnerDashboardQuery = z.infer<typeof ownerDashboardQuerySchema>;

export const expiryBucketSchema = z.enum(["0_30", "31_60", "61_90", "expired"]);
export type ExpiryBucket = z.infer<typeof expiryBucketSchema>;

export const ownerExpiryQuerySchema = z.object({
  bucket: expiryBucketSchema.optional(),
});
export type OwnerExpiryQuery = z.infer<typeof ownerExpiryQuerySchema>;

/** Inventory list tabs (M6 Batch J). Expiry tabs match in-stock lots. */
export const ownerInventoryTabSchema = z.enum([
  "all",
  "low",
  "out",
  "expiring30",
  "expiring90",
  "expired",
]);
export type OwnerInventoryTab = z.infer<typeof ownerInventoryTabSchema>;

export const ownerInventoryQuerySchema = z.object({
  q: z.string().min(1).optional(),
  tab: ownerInventoryTabSchema.optional().default("all"),
  /**
   * Optional supplier deep-link (Prod P4). Products linked via ACTIVE batches
   * with that supplierId and/or purchase-order lines for that supplier.
   */
  supplierId: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().positive().max(100).default(25),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type OwnerInventoryQuery = z.infer<typeof ownerInventoryQuerySchema>;

export const ownerSalesReportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  storeId: z.string().min(1).optional(),
});
export type OwnerSalesReportQuery = z.infer<
  typeof ownerSalesReportQuerySchema
>;

const ownerReportTrendSchema = z.enum(["up", "down", "steady"]);

export const ownerReportKpiSchema = z.object({
  value: z.number(),
  previousValue: z.number(),
  delta: z.number(),
  deltaPct: z.number().nullable(),
  trend: ownerReportTrendSchema,
});

export const ownerSalesReportResponseSchema = z.object({
  range: z.object({
    from: z.string(),
    to: z.string(),
    previousFrom: z.string(),
    previousTo: z.string(),
    storeId: z.string().nullable(),
  }),
  kpis: z.object({
    totalSales: ownerReportKpiSchema,
    txnCount: ownerReportKpiSchema,
    avgOrder: ownerReportKpiSchema,
    itemsSold: ownerReportKpiSchema,
  }),
  dailyBars: z.array(
    z.object({
      date: z.string(),
      totalSales: z.number(),
      txnCount: z.number(),
    }),
  ),
  paymentSummary: z.object({
    CASH: z.number(),
    CARD: z.number(),
    MFS: z.number(),
    total: z.number(),
  }),
  bestSellingCategory: z
    .object({
      category: z.string(),
      unitsSold: z.number(),
      totalSales: z.number(),
    })
    .nullable(),
  highestSalesDay: z
    .object({
      date: z.string(),
      totalSales: z.number(),
      txnCount: z.number(),
    })
    .nullable(),
  topCashiers: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      totalSales: z.number(),
      txnCount: z.number(),
      avgSale: z.number(),
    }),
  ),
  topSellingMedicines: z.array(
    z.object({
      productId: z.string(),
      name: z.string(),
      genericName: z.string().nullable(),
      sku: z.string().nullable(),
      unitsSold: z.number(),
      totalSales: z.number(),
      txnCount: z.number(),
    }),
  ),
  recentTransactions: z.array(
    z.object({
      saleId: z.string(),
      invoiceNo: z.string().nullable(),
      date: z.string(),
      customerName: z.string().nullable(),
      itemCount: z.number(),
      paymentMethods: z.array(z.enum(["CASH", "CARD", "MFS"])),
      total: z.number(),
      cashierName: z.string(),
    }),
  ),
});
export type OwnerSalesReportResponse = z.infer<
  typeof ownerSalesReportResponseSchema
>;

/** Product movement report presets (Enhance D2). Inclusive UTC day spans. */
export const productMovementPresetSchema = z.enum([
  "last30",
  "last90",
  "last180",
]);
export type ProductMovementPreset = z.infer<typeof productMovementPresetSchema>;

export const productMovementBandSchema = z.enum([
  "all",
  "high_demand",
  "steady",
  "low_sell",
  "no_sales",
]);
export type ProductMovementBandFilter = z.infer<
  typeof productMovementBandSchema
>;

export const demandBandSchema = z.enum([
  "high_demand",
  "steady",
  "low_sell",
  "no_sales",
]);
export type DemandBand = z.infer<typeof demandBandSchema>;

export const productMovementStockStatusSchema = z.enum([
  "out",
  "low",
  "healthy",
  "no_threshold",
]);
export type ProductMovementStockStatus = z.infer<
  typeof productMovementStockStatusSchema
>;

export const ownerProductMovementQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  preset: productMovementPresetSchema.optional(),
  storeId: z.string().min(1).optional(),
  band: productMovementBandSchema.optional().default("all"),
  q: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type OwnerProductMovementQuery = z.infer<
  typeof ownerProductMovementQuerySchema
>;

export const ownerProductMovementItemSchema = z.object({
  productId: z.string(),
  sku: z.string(),
  name: z.string(),
  genericName: z.string().nullable(),
  band: demandBandSchema,
  unitsSold: z.number(),
  revenue: z.number(),
  txnCount: z.number(),
  avgDailyUnits: z.number(),
  onHand: z.number(),
  reorderLevel: z.number().nullable(),
  daysOfCover: z.number().nullable(),
  stockStatus: productMovementStockStatusSchema,
});

export const ownerProductMovementResponseSchema = z.object({
  range: z.object({
    from: z.string(),
    to: z.string(),
    preset: productMovementPresetSchema.optional(),
    spanDays: z.number().int().positive(),
  }),
  meta: z.object({
    sellerCount: z.number().int().nonnegative(),
    totalRows: z.number().int().nonnegative(),
  }),
  kpis: z.object({
    highDemandCount: z.number().int().nonnegative(),
    steadyCount: z.number().int().nonnegative(),
    lowSellCount: z.number().int().nonnegative(),
    noSalesCount: z.number().int().nonnegative(),
    totalUnitsSold: z.number(),
    totalRevenue: z.number(),
  }),
  items: z.array(ownerProductMovementItemSchema),
});
export type OwnerProductMovementResponse = z.infer<
  typeof ownerProductMovementResponseSchema
>;

/** Sale-priority stock alarms (Enhance D3). Reuses movement presets/bands. */
export const stockPriorityCodeSchema = z.enum([
  "P1_restock_now",
  "P2_restock_soon",
  "P3_watch_cover",
  "P4_review_slow",
]);
export type StockPriorityCode = z.infer<typeof stockPriorityCodeSchema>;

export const ownerStockPriorityQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  preset: productMovementPresetSchema.optional(),
  storeId: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
export type OwnerStockPriorityQuery = z.infer<
  typeof ownerStockPriorityQuerySchema
>;

export const ownerStockPriorityItemSchema = z.object({
  productId: z.string(),
  sku: z.string(),
  name: z.string(),
  genericName: z.string().nullable(),
  priority: stockPriorityCodeSchema,
  reasons: z.array(z.string()),
  band: demandBandSchema,
  unitsSold: z.number(),
  avgDailyUnits: z.number(),
  onHand: z.number(),
  reorderLevel: z.number().nullable(),
  daysOfCover: z.number().nullable(),
  stockStatus: productMovementStockStatusSchema,
});

export const ownerStockPriorityResponseSchema = z.object({
  range: z.object({
    from: z.string(),
    to: z.string(),
    preset: productMovementPresetSchema.optional(),
    spanDays: z.number().int().positive(),
  }),
  counts: z.object({
    p1: z.number().int().nonnegative(),
    p2: z.number().int().nonnegative(),
    p3: z.number().int().nonnegative(),
    p4: z.number().int().nonnegative(),
  }),
  items: z.array(ownerStockPriorityItemSchema),
});
export type OwnerStockPriorityResponse = z.infer<
  typeof ownerStockPriorityResponseSchema
>;
