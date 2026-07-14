"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AuthError } from "@supabase/supabase-js";

import type { AuthActionState } from "@/lib/auth/action-state";
import { sanitizeInternalPath } from "@/lib/auth/access-control";
import { getAuthConfigurationMessage } from "@/lib/auth/env";
import { getCurrentSmartMedSession } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/auth/supabase";
import {
  flattenZodErrors,
  formValue,
  loginSchema,
  profileSchema,
  resetPasswordSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/auth/validation";
import { siteConfig } from "@/lib/site-config";

function actionError(message: string, fieldErrors?: AuthActionState["fieldErrors"]): AuthActionState {
  return {
    fieldErrors,
    message,
    status: "error",
  };
}

function actionSuccess(message: string): AuthActionState {
  return {
    message,
    status: "success",
  };
}

function mapSupabaseAuthError(error: AuthError) {
  const message = error.message.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "Emailul sau parola nu sunt corecte.";
  }

  if (message.includes("email not confirmed") || message.includes("not confirmed")) {
    return "Adresa de email nu este confirmată încă. Verifică inboxul și confirmă contul.";
  }

  if (message.includes("already registered") || message.includes("already been registered")) {
    return "Există deja un cont pentru această adresă de email.";
  }

  if (message.includes("password")) {
    return "Parola nu respectă regulile de securitate sau linkul de resetare a expirat.";
  }

  if (message.includes("rate limit")) {
    return "Prea multe încercări într-un timp scurt. Încearcă din nou peste câteva minute.";
  }

  return "A apărut o eroare de autentificare. Încearcă din nou.";
}

async function getRequestOrigin() {
  const requestHeaders = await headers();

  return requestHeaders.get("origin") ?? siteConfig.url;
}

function buildCallbackUrl(origin: string, nextPath: string) {
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", sanitizeInternalPath(nextPath));

  return callbackUrl.toString();
}

async function getConfiguredSupabase() {
  const configurationMessage = getAuthConfigurationMessage();

  if (configurationMessage) {
    return {
      error: configurationMessage,
      supabase: null,
    };
  }

  const supabase = await createServerSupabaseClient();

  return {
    error: supabase ? null : "Autentificarea SmartMed nu este disponibilă momentan.",
    supabase,
  };
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formValue(formData, "email"),
    next: formValue(formData, "next"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    return actionError("Verifică datele introduse.", flattenZodErrors(parsed.error));
  }

  const { error: configurationError, supabase } = await getConfiguredSupabase();

  if (!supabase) {
    return actionError(configurationError ?? "Autentificarea SmartMed nu este disponibilă momentan.");
  }

  const nextPath = sanitizeInternalPath(parsed.data.next);
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return actionError(mapSupabaseAuthError(error));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email_confirmed_at && !user?.confirmed_at) {
    await supabase.auth.signOut();

    return actionError("Confirmă adresa de email înainte să intri în cont.");
  }

  revalidatePath("/cont");
  redirect(nextPath);
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    confirmPassword: formValue(formData, "confirmPassword"),
    email: formValue(formData, "email"),
    fullName: formValue(formData, "fullName"),
    next: formValue(formData, "next"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    return actionError("Verifică datele pentru creare cont.", flattenZodErrors(parsed.error));
  }

  const { error: configurationError, supabase } = await getConfiguredSupabase();

  if (!supabase) {
    return actionError(configurationError ?? "Autentificarea SmartMed nu este disponibilă momentan.");
  }

  const origin = await getRequestOrigin();
  const nextPath = sanitizeInternalPath(parsed.data.next);
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
      emailRedirectTo: buildCallbackUrl(origin, nextPath),
    },
    password: parsed.data.password,
  });

  if (error) {
    return actionError(mapSupabaseAuthError(error));
  }

  if (data.session) {
    await supabase.auth.signOut();
  }

  return actionSuccess(
    "Ți-am trimis un email de confirmare. Deschide linkul din email pentru a activa contul SmartMed.",
  );
}

export async function requestPasswordResetAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    email: formValue(formData, "email"),
  });

  if (!parsed.success) {
    return actionError("Introdu o adresă de email validă.", flattenZodErrors(parsed.error));
  }

  const { error: configurationError, supabase } = await getConfiguredSupabase();

  if (!supabase) {
    return actionError(configurationError ?? "Autentificarea SmartMed nu este disponibilă momentan.");
  }

  const origin = await getRequestOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: buildCallbackUrl(origin, "/cont?mode=parola-noua"),
  });

  if (error) {
    return actionError(mapSupabaseAuthError(error));
  }

  return actionSuccess(
    "Dacă adresa există în SmartMed, vei primi un email cu link pentru alegerea unei parole noi.",
  );
}

export async function updatePasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse({
    confirmPassword: formValue(formData, "confirmPassword"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    return actionError("Verifică parola nouă.", flattenZodErrors(parsed.error));
  }

  const { error: configurationError, supabase } = await getConfiguredSupabase();

  if (!supabase) {
    return actionError(configurationError ?? "Autentificarea SmartMed nu este disponibilă momentan.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("Linkul de resetare este invalid sau a expirat. Cere un email nou.");
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return actionError(mapSupabaseAuthError(error));
  }

  revalidatePath("/cont");
  redirect("/cont?status=password-updated");
}

export async function updateProfileAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = profileSchema.safeParse({
    city: formValue(formData, "city"),
    examYear: formValue(formData, "examYear"),
    fullName: formValue(formData, "fullName"),
    phone: formValue(formData, "phone"),
    school: formValue(formData, "school"),
  });

  if (!parsed.success) {
    return actionError("Verifică datele profilului.", flattenZodErrors(parsed.error));
  }

  const session = await getCurrentSmartMedSession();

  if (!session) {
    return actionError("Trebuie să fii autentificat pentru a modifica profilul.");
  }

  const { error: configurationError, supabase } = await getConfiguredSupabase();

  if (!supabase) {
    return actionError(configurationError ?? "Autentificarea SmartMed nu este disponibilă momentan.");
  }

  const { error } = await supabase.from("profiles").upsert({
    city: parsed.data.city,
    exam_year: parsed.data.examYear,
    full_name: parsed.data.fullName,
    id: session.id,
    phone: parsed.data.phone,
    school: parsed.data.school,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return actionError("Profilul nu a putut fi salvat. Încearcă din nou.");
  }

  revalidatePath("/cont");

  return actionSuccess("Profilul tău SmartMed a fost actualizat.");
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  revalidatePath("/cont");
  redirect("/cont?status=logged-out");
}
