import { z } from "zod";

const normalizedEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email("Introdu o adresă de email validă.")
  .max(254, "Adresa de email este prea lungă.");

const changeReason = z
  .string()
  .trim()
  .min(10, "Explică pe scurt motivul (minimum 10 caractere).")
  .max(500, "Motivul poate avea maximum 500 de caractere.");

export const inviteAdministratorSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .max(100, "Numele poate avea maximum 100 de caractere.")
      .optional()
      .transform((value) => value || null),
    email: normalizedEmail,
    reason: changeReason,
  })
  .strict();

export const revokeAdministratorSchema = z
  .object({
    confirmationEmail: normalizedEmail,
    reason: changeReason,
    targetUserId: z.string().uuid("Administratorul selectat este invalid."),
  })
  .strict();

export const cancelAdministratorInvitationSchema = z
  .object({
    invitationId: z.string().uuid("Invitația selectată este invalidă."),
    reason: changeReason,
  })
  .strict();

export type InviteAdministratorInput = z.infer<
  typeof inviteAdministratorSchema
>;
export type RevokeAdministratorInput = z.infer<
  typeof revokeAdministratorSchema
>;
export type CancelAdministratorInvitationInput = z.infer<
  typeof cancelAdministratorInvitationSchema
>;
