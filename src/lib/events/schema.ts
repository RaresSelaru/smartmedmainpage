import { z } from "zod";

export const eventTypes = [
  "simulation",
  "test",
  "webinar",
  "workshop",
  "open_day",
  "course",
  "other",
] as const;

export const eventDeliveryModes = [
  "online",
  "in_person",
  "hybrid",
] as const;

export const eventStatuses = [
  "draft",
  "published",
  "cancelled",
  "completed",
  "archived",
] as const;

export const eventRegistrationStatuses = [
  "confirmed",
  "waitlist",
  "cancelled",
  "attended",
  "no_show",
] as const;

export const eventTypeSchema = z.enum(eventTypes);
export const eventDeliveryModeSchema = z.enum(eventDeliveryModes);
export const eventStatusSchema = z.enum(eventStatuses);
export const eventRegistrationStatusSchema = z.enum(
  eventRegistrationStatuses,
);

const optionalTrimmedText = (maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() !== ""
        ? value.trim()
        : null,
    z.string().max(maximum).nullable(),
  );

const nullableEmail = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() !== ""
      ? value.trim().toLowerCase()
      : null,
  z.string().email("Adresa de email nu este validă.").max(320).nullable(),
);

export const eventEditorInputSchema = z
  .object({
    allowWaitlist: z.boolean(),
    capacity: z.number().int().positive().max(100_000).nullable(),
    contactEmail: nullableEmail,
    coverMediaId: z.number().int().positive().nullable(),
    deliveryMode: eventDeliveryModeSchema,
    description: z
      .string()
      .trim()
      .min(20, "Descrierea trebuie să aibă cel puțin 20 de caractere.")
      .max(6000),
    endsAt: z.string().datetime({ offset: true }),
    eventType: eventTypeSchema,
    featured: z.boolean(),
    locationAddress: optionalTrimmedText(500),
    locationName: optionalTrimmedText(160),
    priceLabel: optionalTrimmedText(80),
    registrationClosesAt: z.string().datetime({ offset: true }),
    registrationOpensAt: z.string().datetime({ offset: true }),
    slug: z
      .string()
      .trim()
      .min(1, "Adresa evenimentului este obligatorie.")
      .max(160)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Adresa poate conține doar litere mici, cifre și cratime.",
      ),
    startsAt: z.string().datetime({ offset: true }),
    status: eventStatusSchema,
    summary: z
      .string()
      .trim()
      .min(20, "Rezumatul trebuie să aibă cel puțin 20 de caractere.")
      .max(360),
    title: z
      .string()
      .trim()
      .min(4, "Titlul trebuie să aibă cel puțin 4 caractere.")
      .max(160),
  })
  .superRefine((value, context) => {
    const startsAt = new Date(value.startsAt).getTime();
    const endsAt = new Date(value.endsAt).getTime();
    const opensAt = new Date(value.registrationOpensAt).getTime();
    const closesAt = new Date(value.registrationClosesAt).getTime();

    if (endsAt <= startsAt) {
      context.addIssue({
        code: "custom",
        message: "Ora de final trebuie să fie după ora de început.",
        path: ["endsAt"],
      });
    }

    if (closesAt <= opensAt) {
      context.addIssue({
        code: "custom",
        message: "Închiderea înscrierilor trebuie să fie după deschidere.",
        path: ["registrationClosesAt"],
      });
    }

    if (closesAt > startsAt) {
      context.addIssue({
        code: "custom",
        message: "Înscrierile trebuie să se închidă înainte de eveniment.",
        path: ["registrationClosesAt"],
      });
    }

    if (value.capacity === null && value.allowWaitlist) {
      context.addIssue({
        code: "custom",
        message: "Lista de așteptare nu este necesară pentru locuri nelimitate.",
        path: ["allowWaitlist"],
      });
    }

    if (
      value.deliveryMode !== "online" &&
      (!value.locationName || value.locationName.length < 2)
    ) {
      context.addIssue({
        code: "custom",
        message: "Adaugă numele centrului sau al locației.",
        path: ["locationName"],
      });
    }

    if (
      ["published", "cancelled", "completed"].includes(value.status) &&
      value.coverMediaId === null
    ) {
      context.addIssue({
        code: "custom",
        message: "Alege o copertă înainte de publicare.",
        path: ["coverMediaId"],
      });
    }
  });

export const publicEventRegistrationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Adresa de email nu este validă.")
    .max(320),
  eventId: z.number().int().positive(),
  fullName: z
    .string()
    .trim()
    .min(2, "Scrie numele complet.")
    .max(120),
  marketingOptIn: z.boolean(),
  phone: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() !== ""
        ? value.trim()
        : null,
    z
      .string()
      .min(7, "Numărul de telefon este prea scurt.")
      .max(32)
      .nullable(),
  ),
  privacyAccepted: z.literal(true, {
    error: "Este necesar acordul pentru prelucrarea datelor.",
  }),
  website: z.string().trim().max(200).optional().default(""),
});

export const registrationRpcResultSchema = z.object({
  accepted: z.literal(true),
  outcome: z.enum(["received", "confirmed", "waitlist"]),
}).strict();

export type EventDeliveryMode = z.infer<typeof eventDeliveryModeSchema>;
export type EventEditorInput = z.infer<typeof eventEditorInputSchema>;
export type EventRegistrationStatus = z.infer<
  typeof eventRegistrationStatusSchema
>;
export type EventStatus = z.infer<typeof eventStatusSchema>;
export type EventType = z.infer<typeof eventTypeSchema>;
export type PublicEventRegistrationInput = z.infer<
  typeof publicEventRegistrationSchema
>;

export function slugifyEventTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 160)
    .replace(/-+$/u, "");
}
