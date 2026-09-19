import { z } from "zod";
import { configurationActivityTypeSchema } from "./enums";

/**
 * Owner Web Slice 8: Settings, Business Profile, Account Profile, Help contracts.
 */

export const ownerBusinessSettingsPatchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  legalName: z.string().trim().nullable().optional(),
  tradeLicenseNo: z.string().trim().nullable().optional(),
  drugLicenseNo: z.string().trim().nullable().optional(),
  vatRegNo: z.string().trim().nullable().optional(),
  contactEmail: z.string().trim().email().nullable().optional().or(z.literal("")),
  contactPhone: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  website: z.string().trim().nullable().optional(),
  openingHours: z.string().trim().nullable().optional(),
  timezone: z.string().trim().optional(),
  // Store-level overrides
  storeName: z.string().trim().min(1).optional(),
  storeAddress: z.string().trim().nullable().optional(),
  storePhone: z.string().trim().nullable().optional(),
  storeOpeningHours: z.string().trim().nullable().optional(),
});
export type OwnerBusinessSettingsPatchInput = z.infer<
  typeof ownerBusinessSettingsPatchSchema
>;

export const ownerBusinessSettingsResponseSchema = z.object({
  tenant: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    legalName: z.string().nullable(),
    tradeLicenseNo: z.string().nullable(),
    drugLicenseNo: z.string().nullable(),
    vatRegNo: z.string().nullable(),
    contactEmail: z.string().nullable(),
    contactPhone: z.string().nullable(),
    address: z.string().nullable(),
    website: z.string().nullable(),
    currency: z.string(),
    timezone: z.string(),
    openingHours: z.string().nullable(),
    updatedAt: z.string(),
  }),
  store: z
    .object({
      id: z.string(),
      name: z.string(),
      code: z.string().nullable(),
      legalName: z.string().nullable(),
      tradeLicenseNo: z.string().nullable(),
      drugLicenseNo: z.string().nullable(),
      vatRegNo: z.string().nullable(),
      contactEmail: z.string().nullable(),
      contactPhone: z.string().nullable(),
      address: z.string().nullable(),
      openingHours: z.string().nullable(),
      timezone: z.string().nullable(),
      isActive: z.boolean(),
    })
    .nullable(),
  timeline: z.array(
    z.object({
      id: z.string(),
      type: configurationActivityTypeSchema,
      section: z.string().nullable(),
      summary: z.string(),
      actorName: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});
export type OwnerBusinessSettingsResponse = z.infer<
  typeof ownerBusinessSettingsResponseSchema
>;

export const ownerAccountSettingsPatchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().nullable().optional(),
});
export type OwnerAccountSettingsPatchInput = z.infer<
  typeof ownerAccountSettingsPatchSchema
>;

export const ownerAccountSettingsResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  phone: z.string().nullable(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
  recentActivity: z.array(
    z.object({
      id: z.string(),
      type: configurationActivityTypeSchema,
      summary: z.string(),
      createdAt: z.string(),
    }),
  ),
});
export type OwnerAccountSettingsResponse = z.infer<
  typeof ownerAccountSettingsResponseSchema
>;

export const ownerChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});
export type OwnerChangePasswordInput = z.infer<
  typeof ownerChangePasswordSchema
>;

export const ownerSettingsActivityQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type OwnerSettingsActivityQuery = z.infer<
  typeof ownerSettingsActivityQuerySchema
>;

export const ownerSettingsActivityItemSchema = z.object({
  id: z.string(),
  type: configurationActivityTypeSchema,
  section: z.string().nullable(),
  summary: z.string(),
  actorName: z.string().nullable(),
  createdAt: z.string(),
});
export type OwnerSettingsActivityItem = z.infer<
  typeof ownerSettingsActivityItemSchema
>;

export const ownerSettingsActivityListResponseSchema = z.array(
  ownerSettingsActivityItemSchema,
);
export type OwnerSettingsActivityListResponse = z.infer<
  typeof ownerSettingsActivityListResponseSchema
>;


export const ownerHelpStatusResponseSchema = z.object({
  status: z.enum(["OPERATIONAL", "DEGRADED", "DOWN"]),
  version: z.string(),
  environment: z.string(),
  database: z.enum(["CONNECTED", "DISCONNECTED"]),
  syncEngine: z.enum(["HEALTHY", "DEGRADED", "OFFLINE"]),
  timestamp: z.string(),
  supportContact: z.object({
    email: z.string(),
    phone: z.string(),
    hours: z.string(),
  }),
});
export type OwnerHelpStatusResponse = z.infer<
  typeof ownerHelpStatusResponseSchema
>;
