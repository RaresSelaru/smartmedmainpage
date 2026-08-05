export type AdministratorMfaStatus =
  | "not-enrolled"
  | "unavailable"
  | "verified";

export type AdministratorRecord = {
  createdAt: string;
  email: string;
  fullName: string;
  grantedAt: string;
  id: string;
  isSuperAdmin: boolean;
  lastSignInAt: string | null;
  mfaStatus: AdministratorMfaStatus;
};

export type AdministratorInvitationStatus =
  | "delivery-failed"
  | "pending"
  | "pending-delivery";

export type AdministratorInvitationRecord = {
  createdAt: string;
  displayName: string | null;
  email: string;
  expiresAt: string;
  id: string;
  reason: string;
  sentAt: string | null;
  status: AdministratorInvitationStatus;
};

export type AdministratorsOverview = {
  administrators: AdministratorRecord[];
  invitations: AdministratorInvitationRecord[];
};

export type AdministratorMutationReceipt = {
  email: string;
  mode:
    | "already-admin"
    | "cancelled"
    | "existing-granted"
    | "invitation-sent"
    | "revoked";
};
