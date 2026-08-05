"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { AdminActionResult } from "@/lib/admin/action-result";
import type { AdministratorMutationReceipt } from "@/lib/admin/administrators-types";
import {
  cancelAdministratorInvitationSchema,
  inviteAdministratorSchema,
  revokeAdministratorSchema,
} from "@/lib/admin/administrators-schema";
import {
  authorizeAdminCapability,
  type AdminAuthorizationFailureCode,
} from "@/lib/admin/auth";
import { createServerSupabaseClient } from "@/lib/auth/supabase";
import { siteConfig } from "@/lib/site-config";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type RpcError = {
  code?: string;
  message: string;
};

type AdministratorRpcClient = {
  rpc(
    name: string,
    args?: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: RpcError | null }>;
};

const preparedInvitationSchema = z
  .object({
    email: z.string().email(),
    invitationId: z.string().uuid().nullable().optional(),
    mode: z.string().min(1).max(64),
  })
  .passthrough();

function failure(message: string): AdminActionResult<never> {
  return { code: "unavailable", message, ok: false };
}

function validationFailure(error: z.ZodError): AdminActionResult<never> {
  const flattened = z.flattenError(error);

  return {
    code: "invalid-input",
    fieldErrors: Object.fromEntries(
      Object.entries(flattened.fieldErrors).filter(
        (entry): entry is [string, string[]] =>
          Array.isArray(entry[1]) && entry[1].length > 0,
      ),
    ),
    message: "Verifică informațiile introduse.",
    ok: false,
  };
}

function authorizationFailure(
  code: AdminAuthorizationFailureCode,
): AdminActionResult<never> {
  if (code === "unauthenticated") {
    return {
      code,
      message: "Sesiunea a expirat. Conectează-te din nou.",
      ok: false,
    };
  }

  if (code === "mfa-required") {
    return {
      code: "forbidden",
      message: "Confirmă autentificarea în doi pași înainte de această acțiune.",
      ok: false,
    };
  }

  if (code === "configuration" || code === "unavailable") {
    return failure("Gestionarea administratorilor nu este disponibilă momentan.");
  }

  return {
    code: "forbidden",
    message: "Doar super administratorul poate face această modificare.",
    ok: false,
  };
}

function databaseFailure(error: RpcError): AdminActionResult<never> {
  if (error.code === "42501") {
    if (error.message.toLowerCase().includes("recent totp")) {
      return {
        code: "forbidden",
        message:
          "Reconfirmă codul MFA înainte de această operațiune sensibilă.",
        ok: false,
      };
    }

    return {
      code: "forbidden",
      message: "Doar super administratorul poate face această modificare.",
      ok: false,
    };
  }

  if (error.code === "23505" || error.message.includes("INVITATION_EXISTS")) {
    return {
      code: "conflict",
      message: "Există deja o invitație activă pentru această adresă.",
      ok: false,
    };
  }

  if (error.code === "22023" || error.code === "23514") {
    return {
      code: "invalid-input",
      message: "Datele operațiunii nu sunt valide.",
      ok: false,
    };
  }

  if (error.code === "P0002") {
    return {
      code: "not-found",
      message: "Administratorul sau invitația nu mai există.",
      ok: false,
    };
  }

  console.error("SmartMed administrator mutation failed", {
    code: error.code ?? "unknown",
  });
  return failure("Modificarea nu a putut fi salvată. Încearcă din nou.");
}

function normalizeMode(value: string) {
  return value.trim().toLowerCase().replaceAll("_", "-");
}

function revalidateAdministratorAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/administratori");
}

async function authorizedRpcClient(): Promise<
  | { error: AdminActionResult<never>; rpc: null }
  | { error: null; rpc: AdministratorRpcClient }
> {
  const authorization = await authorizeAdminCapability(
    "administrators.manage",
  );
  if (!authorization.ok) {
    return { error: authorizationFailure(authorization.code), rpc: null };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      error: failure("Serviciul de administrare nu este configurat."),
      rpc: null,
    };
  }

  return {
    error: null,
    rpc: supabase as unknown as AdministratorRpcClient,
  };
}

export async function inviteAdministratorAction(
  rawInput: unknown,
): Promise<AdminActionResult<AdministratorMutationReceipt>> {
  const parsed = inviteAdministratorSchema.safeParse(rawInput);
  if (!parsed.success) return validationFailure(parsed.error);

  const authorized = await authorizedRpcClient();
  if (authorized.error) return authorized.error;

  const correlationId = randomUUID();
  const prepared = await authorized.rpc.rpc("cms_prepare_admin_invitation", {
    p_correlation_id: correlationId,
    p_display_name: parsed.data.displayName,
    p_email: parsed.data.email,
    p_reason: parsed.data.reason,
  });
  if (prepared.error) return databaseFailure(prepared.error);

  const preparedData = preparedInvitationSchema.safeParse(prepared.data);
  if (!preparedData.success) {
    return failure("Răspunsul invitației nu a putut fi verificat.");
  }

  const mode = normalizeMode(preparedData.data.mode);
  if (mode === "existing-granted" || mode === "already-admin") {
    revalidateAdministratorAdmin();
    return {
      data: {
        email: preparedData.data.email,
        mode,
      },
      ok: true,
    };
  }

  if (mode === "already-pending") {
    return {
      code: "conflict",
      message: "Există deja o invitație activă pentru această adresă.",
      ok: false,
    };
  }

  if (
    !["invitation-required", "pending-delivery"].includes(mode) ||
    !preparedData.data.invitationId
  ) {
    return failure("Invitația nu a putut fi pregătită în siguranță.");
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return failure("Serviciul securizat de invitații nu este configurat.");
  }

  const callbackUrl = new URL("/auth/callback", siteConfig.url);
  callbackUrl.searchParams.set("next", "/cont?mode=parola-noua");
  const invited = await service.auth.admin.inviteUserByEmail(
    preparedData.data.email,
    {
      data: {
        ...(parsed.data.displayName
          ? { full_name: parsed.data.displayName }
          : {}),
        invitation_source: "admin_console",
      },
      redirectTo: callbackUrl.toString(),
    },
  );

  const delivered = !invited.error && Boolean(invited.data.user);
  const marked = await (
    service as unknown as AdministratorRpcClient
  ).rpc("cms_mark_admin_invitation_delivery", {
    p_correlation_id: correlationId,
    p_delivered: delivered,
    p_error_code: delivered
      ? null
      : invited.error?.code ?? "invalid_response",
    p_invitation_id: preparedData.data.invitationId,
    p_target_user_id: invited.data.user?.id ?? null,
  });

  if (marked.error) return databaseFailure(marked.error);
  if (!delivered) {
    console.error("SmartMed administrator invitation delivery failed", {
      code: invited.error?.code ?? "invalid_response",
      invitationId: preparedData.data.invitationId,
    });
    return failure(
      "Invitația nu a putut fi trimisă. Verifică serviciul de email și încearcă din nou.",
    );
  }

  revalidateAdministratorAdmin();
  return {
    data: {
      email: preparedData.data.email,
      mode: "invitation-sent",
    },
    ok: true,
  };
}

export async function revokeAdministratorAction(
  rawInput: unknown,
): Promise<AdminActionResult<AdministratorMutationReceipt>> {
  const parsed = revokeAdministratorSchema.safeParse(rawInput);
  if (!parsed.success) return validationFailure(parsed.error);

  const authorized = await authorizedRpcClient();
  if (authorized.error) return authorized.error;

  const revoked = await authorized.rpc.rpc("cms_revoke_admin", {
    p_confirmation_email: parsed.data.confirmationEmail,
    p_correlation_id: randomUUID(),
    p_reason: parsed.data.reason,
    p_target_user_id: parsed.data.targetUserId,
  });
  if (revoked.error) return databaseFailure(revoked.error);

  revalidateAdministratorAdmin();
  return {
    data: {
      email: parsed.data.confirmationEmail,
      mode: "revoked",
    },
    ok: true,
  };
}

export async function cancelAdministratorInvitationAction(
  rawInput: unknown,
): Promise<AdminActionResult<AdministratorMutationReceipt>> {
  const parsed = cancelAdministratorInvitationSchema.safeParse(rawInput);
  if (!parsed.success) return validationFailure(parsed.error);

  const authorized = await authorizedRpcClient();
  if (authorized.error) return authorized.error;

  const cancelled = await authorized.rpc.rpc("cms_cancel_admin_invitation", {
    p_correlation_id: randomUUID(),
    p_invitation_id: parsed.data.invitationId,
    p_reason: parsed.data.reason,
  });
  if (cancelled.error) return databaseFailure(cancelled.error);

  const result = z
    .object({ email: z.string().email() })
    .passthrough()
    .safeParse(cancelled.data);
  if (!result.success) {
    return failure("Confirmarea anulării nu a putut fi verificată.");
  }

  revalidateAdministratorAdmin();
  return {
    data: { email: result.data.email, mode: "cancelled" },
    ok: true,
  };
}
