/** CRM prospect-tracking constants shared by server and client code. */

export const CRM_CLIENT_STATUSES = [
  "COLD_PROSPECT",
  "CLOSED_PROSPECT",
  "HOT_PROSPECT",
  "SIGNED_UP_CLIENT",
  "ACTIVE_CLIENT",
  "DORMANT_CLIENT",
] as const;

export type CrmClientStatus = (typeof CRM_CLIENT_STATUSES)[number];

export const DEFAULT_CRM_CLIENT_STATUS: CrmClientStatus = "COLD_PROSPECT";

export const CRM_CLIENT_STATUS_LABELS: Record<CrmClientStatus, string> = {
  COLD_PROSPECT: "Cold Prospect",
  CLOSED_PROSPECT: "Closed Prospect",
  HOT_PROSPECT: "Hot Prospect",
  SIGNED_UP_CLIENT: "Signed-up Client",
  ACTIVE_CLIENT: "Active Client",
  DORMANT_CLIENT: "Dormant Client",
};

export function isCrmClientStatus(value: unknown): value is CrmClientStatus {
  return (
    typeof value === "string" &&
    (CRM_CLIENT_STATUSES as readonly string[]).includes(value)
  );
}

export const COMMUNICATION_INITIATED_BY = ["CLIENT", "RF"] as const;
export type CommunicationInitiatedBy = (typeof COMMUNICATION_INITIATED_BY)[number];

export const COMMUNICATION_INITIATED_BY_LABELS: Record<CommunicationInitiatedBy, string> = {
  CLIENT: "Client",
  RF: "RF",
};

export function isCommunicationInitiatedBy(value: unknown): value is CommunicationInitiatedBy {
  return (
    typeof value === "string" &&
    (COMMUNICATION_INITIATED_BY as readonly string[]).includes(value)
  );
}

export const COMMUNICATION_SOURCES = [
  "FOLLOW_UP",
  "WEB_ENQUIRY",
  "RECOMMENDATION",
  "LINKEDIN",
  "EMAIL_MARKETING",
  "OTHERS",
] as const;
export type CommunicationSource = (typeof COMMUNICATION_SOURCES)[number];

export const COMMUNICATION_SOURCE_LABELS: Record<CommunicationSource, string> = {
  FOLLOW_UP: "Follow-up",
  WEB_ENQUIRY: "Web enquiry",
  RECOMMENDATION: "Recommendation",
  LINKEDIN: "LinkedIn",
  EMAIL_MARKETING: "Email Marketing",
  OTHERS: "Others",
};

export function isCommunicationSource(value: unknown): value is CommunicationSource {
  return (
    typeof value === "string" &&
    (COMMUNICATION_SOURCES as readonly string[]).includes(value)
  );
}
