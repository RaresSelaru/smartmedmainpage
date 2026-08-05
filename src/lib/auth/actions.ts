"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AuthError } from "@supabase/supabase-js";

import type { AuthActionState } from "@/lib/auth/action-state";
import { sanitizeInternalPath } from "@/lib/auth/access-control";
import { getAuthConfigurationMessage } from "@/lib/auth/env";
import {
  getOAuthProviderAvailability,
  type SmartMedOAuthProvider,
} from "@/lib/auth/oauth";
import { getCurrentSmartMedSession } from "@/lib/auth/session";
import { smartMedSignupProfileMetadataSchema } from "@/lib/auth/signup-profile";
import { createServerSupabaseClient } from "@/lib/auth/supabase";
import { consumePendingCenterEnrollmentLink } from "@/lib/center-enrollments/account-link";
import {
  flattenZodErrors,
  formValue,
  loginSchema,
  oauthLoginSchema,
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
  switch (error.code) {
    case "invalid_credentials":
      return "Emailul sau parola nu sunt corecte.";
    case "email_not_confirmed":
      return "Adresa de email nu este confirmată încă. Verifică inboxul și confirmă contul.";
    case "user_already_exists":
    case "email_exists":
      return "Există deja un cont pentru această adresă de email.";
    case "weak_password":
    case "same_password":
    case "otp_expired":
      return "Parola nu respectă regulile de securitate sau linkul de resetare a expirat.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Prea multe încercări într-un timp scurt. Încearcă din nou peste câteva minute.";
  }

  // Keep a defensive fallback for older Auth server versions whose errors do
  // not yet expose a stable code.
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
  const requestOrigin = requestHeaders.get("origin");

  if (process.env.NODE_ENV === "development" && requestOrigin) {
    try {
      const parsed = new URL(requestOrigin);

      if (
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "[::1]"
      ) {
        return parsed.origin;
      }
    } catch {
      // Fall through to the canonical, allow-listed production URL.
    }
  }

  return siteConfig.url;
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

  const supabase = await createServerSupabaseClient({
    requireCookieWrites: true,
  });

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
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    await supabase.auth.signOut({ scope: "local" });

    return actionError("Sesiunea nu a putut fi verificată. Încearcă din nou.");
  }

  if (!user.email_confirmed_at) {
    await supabase.auth.signOut({ scope: "local" });

    return actionError("Confirmă adresa de email înainte să intri în cont.");
  }

  const enrollmentLink = await consumePendingCenterEnrollmentLink(supabase);
  revalidatePath("/cont");
  if (enrollmentLink.linked && nextPath === "/cont") {
    redirect("/cont?status=enrollment-linked");
  }
  redirect(nextPath);
}

export async function oauthLoginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = oauthLoginSchema.safeParse({
    next: formValue(formData, "next"),
    provider: formValue(formData, "provider"),
  });

  if (!parsed.success) {
    return actionError("Metoda de conectare nu este validă.");
  }

  const availability = getOAuthProviderAvailability();
  const provider = parsed.data.provider as SmartMedOAuthProvider;

  if (!availability[provider]) {
    return actionError(
      provider === "google"
        ? "Conectarea cu Google așteaptă activarea cheilor proiectului."
        : "Conectarea cu Facebook așteaptă activarea cheilor proiectului.",
    );
  }

  const { error: configurationError, supabase } = await getConfiguredSupabase();

  if (!supabase) {
    return actionError(
      configurationError ?? "Autentificarea SmartMed nu este disponibilă momentan.",
    );
  }

  const origin = await getRequestOrigin();
  const nextPath = sanitizeInternalPath(parsed.data.next);
  const { data, error } = await supabase.auth.signInWithOAuth({
    options: {
      redirectTo: buildCallbackUrl(origin, nextPath),
      skipBrowserRedirect: true,
    },
    provider,
  });

  if (error || !data.url) {
    return actionError(
      `Conectarea cu ${provider === "google" ? "Google" : "Facebook"} nu a putut porni. Încearcă din nou.`,
    );
  }

  redirect(data.url);
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
  const signupMetadata = smartMedSignupProfileMetadataSchema.parse({
    full_name: parsed.data.fullName,
    signup_source: "account",
  });
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    options: {
      data: signupMetadata,
      emailRedirectTo: buildCallbackUrl(origin, nextPath),
    },
    password: parsed.data.password,
  });

  if (error) {
    return actionError(mapSupabaseAuthError(error));
  }

  if (data.session) {
    await supabase.auth.signOut({ scope: "local" });
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
  const supabase = await createServerSupabaseClient({
    requireCookieWrites: true,
  });

  if (supabase) {
    await supabase.auth.signOut({ scope: "local" });
  }

  revalidatePath("/cont");
  redirect("/cont?status=logged-out");
}
