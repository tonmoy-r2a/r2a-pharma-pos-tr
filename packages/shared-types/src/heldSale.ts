import { z } from "zod";

/** Soft hold cap — store-scoped when online (same as local max 3). */
export const MAX_HELD_SALES = 3;

export const heldSaleStatusSchema = z.enum(["HELD", "DISCARDED", "RESUMED"]);
export type HeldSaleStatus = z.infer<typeof heldSaleStatusSchema>;

/**
 * Cart snapshot body. Deep line shape is owned by desktop POS;
 * cloud stores JSON without inventing a second cart DTO.
 */
export const heldSalePayloadSchema = z.object({
  lines: z.array(z.record(z.unknown())).min(1),
  customer: z.record(z.unknown()).nullable().optional(),
  loyalty: z.record(z.unknown()).nullable().optional(),
});
export type HeldSalePayload = z.infer<typeof heldSalePayloadSchema>;

/** Create / push a soft hold. Optional `id` = client UUID for offline reconnect idempotency. */
export const heldSaleCreateSchema = z.object({
  id: z.string().trim().min(1).max(64).optional(),
  terminalId: z.string().trim().min(1).max(128),
  label: z.string().trim().min(1).max(200),
  heldAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  payload: heldSalePayloadSchema,
});
export type HeldSaleCreateInput = z.infer<typeof heldSaleCreateSchema>;

export const heldSaleIdParamSchema = z.object({
  heldSaleId: z.string().trim().min(1),
});
export type HeldSaleIdParam = z.infer<typeof heldSaleIdParamSchema>;

/** Row returned to desktop (active HELD only on list). */
export const heldSaleRowSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  storeId: z.string(),
  userId: z.string(),
  terminalId: z.string(),
  label: z.string(),
  heldAt: z.coerce.date(),
  expiresAt: z.coerce.date().nullable().optional(),
  status: heldSaleStatusSchema,
  payload: heldSalePayloadSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type HeldSaleRow = z.infer<typeof heldSaleRowSchema>;
