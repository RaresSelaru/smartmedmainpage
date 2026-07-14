import { z } from "zod";

const optionalProfileText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, `Maximum ${maxLength} de caractere.`)
    .optional()
    .transform((value) => (value ? value : null));

export const emailSchema = z
  .string()
  .trim()
  .email("Introdu o adresă de email validă.")
  .max(254, "Adresa de email este prea lungă.");

export const passwordSchema = z
  .string()
  .min(8, "Parola trebuie să aibă cel puțin 8 caractere.")
  .regex(/[A-Za-zĂÂÎȘȚăâîșț]/, "Parola trebuie să conțină cel puțin o literă.")
  .regex(/[0-9]/, "Parola trebuie să conțină cel puțin o cifră.");

export const loginSchema = z.object({
  email: emailSchema,
  next: z.string().optional(),
  password: z.string().min(1, "Introdu parola."),
});

export const signUpSchema = z
  .object({
    confirmPassword: z.string().min(1, "Confirmă parola."),
    email: emailSchema,
    fullName: z
      .string()
      .trim()
      .min(2, "Numele trebuie să aibă cel puțin 2 caractere.")
      .max(100, "Numele este prea lung."),
    next: z.string().optional(),
    password: passwordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Parolele nu coincid.",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z
  .object({
    confirmPassword: z.string().min(1, "Confirmă parola nouă."),
    password: passwordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Parolele nu coincid.",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  city: optionalProfileText(80),
  examYear: optionalProfileText(20),
  fullName: z
    .string()
    .trim()
    .min(2, "Numele trebuie să aibă cel puțin 2 caractere.")
    .max(100, "Numele este prea lung."),
  phone: optionalProfileText(32),
  school: optionalProfileText(120),
});

export function formValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export function flattenZodErrors(error: z.ZodError) {
  return error.flatten().fieldErrors;
}
