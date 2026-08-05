import "server-only";

import { z } from "zod";

import type {
  AdministratorInvitationRecord,
  AdministratorInvitationStatus,
  AdministratorRecord,
  AdministratorsOverview,
} from "@/lib/admin/administrators-types";
import { createServerSupabaseClient } from "@/lib/auth/supabase";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type AdministratorsOverviewResult = {
  data: AdministratorsOverview;
  error: string | null;
};

type AdministratorRpcClient = {
  rpc(
    name: "cms_list_administrators",
  ): PromiseLike<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
};

const timestampSchema = z.string().min(1).max(64);
const administratorSchema = z.object({
  createdAt: timestampSchema,
  email: z.string().email().max(254),
  fullName: z.string().min(1).max(160),
  grantedAt: timestampSchema,
  id: z.string().uuid(),
  isSuperAdmin: z.boolean(),
  lastSignInAt: timestampSchema.nullable(),
});
const invitationSchema = z.object({
  createdAt: timestampSchema,
  displayName: z.string().max(100).nullable(),
  email: z.string().email().max(254),
  expiresAt: timestampSchema,
  id: z.string().uuid(),
  reason: z.string().min(1).max(500),
  sentAt: timestampSchema.nullable(),
  status: z.enum(["failed", "requested", "sent"]),
});
const overviewSchema = z.object({
  administrators: z.array(administratorSchema).max(500),
  invitations: z.array(invitationSchema).max(500),
});

function emptyOverview(): AdministratorsOverview {
  return { administrators: [], invitations: [] };
}

function normalizeInvitationStatus(
  status: z.infer<typeof invitationSchema>["status"],
): AdministratorInvitationStatus {
  if (status === "failed") return "delivery-failed";
  if (status === "requested") return "pending-delivery";
  return "pending";
}

async function enrichAdministratorMfa(
  administrators: z.infer<typeof administratorSchema>[],
): Promise<AdministratorRecord[]> {
  const service = createSupabaseServiceClient();

  if (!service) {
    return administrators.map((administrator) => ({
      ...administrator,
      mfaStatus: "unavailable",
    }));
  }

  return Promise.all(
    administrators.map(async (administrator): Promise<AdministratorRecord> => {
      const factors = await service.auth.admin.mfa.listFactors({
        userId: administrator.id,
      });

      if (factors.error) {
        console.error("SmartMed administrator MFA lookup failed", {
          code: factors.error.code,
          userId: administrator.id,
        });
        return { ...administrator, mfaStatus: "unavailable" };
      }

      const verified = factors.data.factors.some(
        (factor) =>
          factor.factor_type === "totp" && factor.status === "verified",
      );

      return {
        ...administrator,
        mfaStatus: verified ? "verified" : "not-enrolled",
      };
    }),
  );
}

export async function getAdministratorsOverview(): Promise<
  AdministratorsOverviewResult
> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      data: emptyOverview(),
      error: "Serviciul de administrare nu este configurat.",
    };
  }

  const result = await (
    supabase as unknown as AdministratorRpcClient
  ).rpc("cms_list_administrators");

  if (result.error) {
    console.error("SmartMed administrator overview failed", {
      code: result.error.code ?? "unknown",
    });
    return {
      data: emptyOverview(),
      error: "Administratorii nu au putut fi încărcați momentan.",
    };
  }

  const parsed = overviewSchema.safeParse(result.data);
  if (!parsed.success) {
    console.error("SmartMed administrator overview response was rejected", {
      issueCount: parsed.error.issues.length,
    });
    return {
      data: emptyOverview(),
      error: "Datele administratorilor nu au putut fi verificate.",
    };
  }

  const administrators = await enrichAdministratorMfa(
    parsed.data.administrators,
  );
  const invitations: AdministratorInvitationRecord[] =
    parsed.data.invitations.map((invitation) => ({
      ...invitation,
      status: normalizeInvitationStatus(invitation.status),
    }));

  return {
    data: { administrators, invitations },
    error: null,
  };
}
