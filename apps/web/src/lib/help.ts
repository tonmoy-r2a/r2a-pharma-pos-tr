import type { OwnerHelpStatusResponse } from "@r2a/shared-types";
import { apiRequest } from "./api";

export type HelpStatus = OwnerHelpStatusResponse;

export async function fetchHelpStatus(): Promise<HelpStatus> {
  return apiRequest<HelpStatus>("/api/v1/owner/help/status");
}
