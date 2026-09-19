import type {
  OwnerAccountSettingsPatchInput,
  OwnerAccountSettingsResponse,
  OwnerBusinessSettingsPatchInput,
  OwnerBusinessSettingsResponse,
  OwnerChangePasswordInput,
} from "@r2a/shared-types";
import { apiRequest } from "./api";

export type BusinessSettings = OwnerBusinessSettingsResponse;
export type BusinessSettingsPatch = OwnerBusinessSettingsPatchInput;
export type AccountSettings = OwnerAccountSettingsResponse;
export type AccountSettingsPatch = OwnerAccountSettingsPatchInput;
export type ChangePasswordInput = OwnerChangePasswordInput;

export async function fetchBusinessSettings(): Promise<BusinessSettings> {
  return apiRequest<BusinessSettings>("/api/v1/owner/settings/business");
}

export async function patchBusinessSettings(
  body: BusinessSettingsPatch,
): Promise<BusinessSettings> {
  return apiRequest<BusinessSettings>("/api/v1/owner/settings/business", {
    method: "PATCH",
    body,
  });
}

export async function fetchAccountSettings(): Promise<AccountSettings> {
  return apiRequest<AccountSettings>("/api/v1/owner/settings/account");
}

export async function patchAccountSettings(
  body: AccountSettingsPatch,
): Promise<AccountSettings> {
  return apiRequest<AccountSettings>("/api/v1/owner/settings/account", {
    method: "PATCH",
    body,
  });
}

export async function changeOwnerPassword(
  body: ChangePasswordInput,
): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(
    "/api/v1/owner/settings/account/change-password",
    { method: "POST", body },
  );
}
