import { z } from "zod";

import { evaluationGoals } from "@/lib/evaluations/types";

const optionalTrimmedText = (maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() !== "" ? value.trim() : null,
    z.string().max(maximum).nullable(),
  );

export const bookEvaluationSchema = z
  .object({
    bookingRequestId: z.uuid("Reîncarcă pagina și încearcă din nou."),
    customerNotes: optionalTrimmedText(600),
    goal: z.enum(evaluationGoals, {
      error: "Alege ce ai vrea să clarificăm împreună.",
    }),
    phone: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() !== "" ? value.trim() : null,
      z
        .string()
        .min(7, "Numărul de telefon este prea scurt.")
        .max(32, "Numărul de telefon este prea lung.")
        .regex(/^[+()\d\s.-]+$/u, "Numărul de telefon conține caractere nepermise.")
        .nullable(),
    ),
    privacyAccepted: z.literal(true, {
      error: "Confirmă că putem folosi datele pentru gestionarea programării.",
    }),
    slotId: z.number().int().positive("Alege un interval disponibil."),
    source: z.string().trim().min(1).max(80).default("home-hero"),
  })
  .strict();

export const rescheduleEvaluationSchema = z
  .object({
    publicId: z.uuid("Programarea nu este validă."),
    slotId: z.number().int().positive("Alege un interval disponibil."),
  })
  .strict();

export const evaluationPublicIdSchema = z
  .object({
    publicId: z.uuid("Programarea nu este validă."),
  })
  .strict();

export const evaluationAppointmentReceiptSchema = z
  .object({
    bookingVersion: z.number().int().positive(),
    endsAt: z.iso.datetime({ offset: true }),
    publicId: z.uuid(),
    reused: z.boolean().optional(),
    startsAt: z.iso.datetime({ offset: true }),
    status: z.enum([
      "requested",
      "pending",
      "confirmed",
      "completed",
      "cancelled",
      "declined",
      "no_show",
    ]),
  })
  .passthrough();

export type BookEvaluationInput = z.infer<typeof bookEvaluationSchema>;
export type RescheduleEvaluationInput = z.infer<
  typeof rescheduleEvaluationSchema
>;
