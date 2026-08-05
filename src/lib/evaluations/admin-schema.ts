import { z } from "zod";

export const evaluationStatuses = [
  "requested",
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "declined",
  "no_show",
] as const;

export type EvaluationStatus = (typeof evaluationStatuses)[number];

export const evaluationStatusSchema = z.enum(evaluationStatuses);

const optionalReasonSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() !== ""
      ? value.trim()
      : null,
  z.string().max(500, "Motivul poate avea cel mult 500 de caractere.").nullable(),
);

const optionalLabelSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() !== ""
      ? value.trim()
      : null,
  z.string().max(120, "Eticheta poate avea cel mult 120 de caractere.").nullable(),
);

export const evaluationMutationSchema = z.object({
  publicId: z.string().uuid("Programarea selectată nu este validă."),
  reason: optionalReasonSchema,
  slotId: z.number().int().positive().nullable(),
  status: evaluationStatusSchema,
});

export const evaluationNotificationRetrySchema = z.object({
  publicId: z.string().uuid("Programarea selectată nu este validă."),
});

export const evaluationSlotCreateSchema = z.object({
  capacity: z
    .number()
    .int("Numărul de locuri trebuie să fie un număr întreg.")
    .min(1, "Este necesar cel puțin un loc.")
    .max(250, "Poți adăuga cel mult 250 de locuri într-o sesiune."),
  locationId: z.number().int().positive(),
  publicLabel: optionalLabelSchema,
  staffMemberId: z.number().int().positive(),
  startsAt: z.string().datetime({ offset: true }),
});

export const evaluationSlotCapacityUpdateSchema = z.object({
  capacity: z
    .number()
    .int("Numărul de locuri trebuie să fie un număr întreg.")
    .min(1, "Este necesar cel puțin un loc.")
    .max(250, "Poți adăuga cel mult 250 de locuri într-o sesiune."),
  slotId: z.number().int().positive(),
});

export const evaluationSlotDeleteSchema = z.object({
  slotId: z.number().int().positive(),
});

export type EvaluationMutationInput = z.infer<
  typeof evaluationMutationSchema
>;
export type EvaluationSlotCreateInput = z.infer<
  typeof evaluationSlotCreateSchema
>;
export type EvaluationSlotCapacityUpdateInput = z.infer<
  typeof evaluationSlotCapacityUpdateSchema
>;
