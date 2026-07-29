import { randomUUID } from "node:crypto";

import { createServerClient } from "@supabase/ssr";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { z } from "zod";

import {
  assertLocalAppUrl,
  assertLocalSupabaseUrl,
  normalizeOperatorEmail,
  publicTargetSummary,
  readHostedTarget,
  requiredEnvironment,
  requireHostedExecution,
  validateLocalAdminPassword,
} from "./admin-provision-lib.ts";
import type { SmartMedDatabase } from "../src/lib/auth/database.types.ts";

type OperatorCommand =
  | "hosted:grant"
  | "hosted:invite"
  | "hosted:revoke"
  | "hosted:verify"
  | "local:provision";

type OperatorRpcClient = {
  rpc(
    name:
      | "cms_operator_grant_admin"
      | "cms_operator_revoke_admin"
      | "cms_operator_set_local_mfa_requirement",
    args: Record<string, unknown>,
  ): PromiseLike<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
};

const supportedCommands = new Set<OperatorCommand>([
  "hosted:grant",
  "hosted:invite",
  "hosted:revoke",
  "hosted:verify",
  "local:provision",
]);

const displayNameSchema = z.string().trim().min(2).max(100);

function serviceClient(url: string, secret: string) {
  return createClient<SmartMedDatabase>(url, secret, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function resolveExactUser(
  supabase: SupabaseClient<SmartMedDatabase>,
  email: string,
): Promise<User | null> {
  const matches: User[] = [];
  const perPage = 200;

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Utilizatorii Auth nu au putut fi listați (${error.code}).`);
    }

    matches.push(
      ...data.users.filter(
        (user) => user.email?.trim().toLowerCase() === email,
      ),
    );

    if (
      data.users.length < perPage ||
      ("lastPage" in data && page >= (data.lastPage || page))
    ) {
      break;
    }
  }

  if (matches.length > 1) {
    throw new Error(
      "Rezolvarea exactă a utilizatorului a returnat mai multe identități.",
    );
  }

  return matches[0] ?? null;
}

async function callOperatorRpc(
  supabase: SupabaseClient<SmartMedDatabase>,
  name:
    | "cms_operator_grant_admin"
    | "cms_operator_revoke_admin"
    | "cms_operator_set_local_mfa_requirement",
  args: Record<string, unknown>,
) {
  const { data, error } = await (
    supabase as unknown as OperatorRpcClient
  ).rpc(name, args);

  if (error) {
    throw new Error(`${name} a eșuat (${error.code ?? "database_error"}).`);
  }

  return data;
}

async function readProfileAndRole(
  supabase: SupabaseClient<SmartMedDatabase>,
  userId: string,
) {
  const [profileResult, roleResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("account_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (profileResult.error || roleResult.error) {
    throw new Error("Profilul sau rolul operațional nu a putut fi verificat.");
  }

  return {
    profile: profileResult.data,
    role: roleResult.data?.role ?? null,
  };
}

function publishableCookieClient(url: string, publishableKey: string) {
  const cookieJar = new Map<string, string>();
  const client = createServerClient<SmartMedDatabase>(url, publishableKey, {
    cookies: {
      getAll() {
        return [...cookieJar].map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          if (cookie.value === "") {
            cookieJar.delete(cookie.name);
          } else {
            cookieJar.set(cookie.name, cookie.value);
          }
        }
      },
    },
  });

  return {
    client,
    cookieHeader() {
      return [...cookieJar]
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
    },
  };
}

async function signInForRouteVerification(input: {
  appUrl: string;
  email: string;
  password: string;
  publishableKey: string;
  supabaseUrl: string;
}) {
  const cookieClient = publishableCookieClient(
    input.supabaseUrl,
    input.publishableKey,
  );
  const { error } = await cookieClient.client.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    throw new Error(`Autentificarea de verificare a eșuat (${error.code}).`);
  }

  return async (path: string) =>
    fetch(new URL(path, input.appUrl), {
      headers: {
        Cookie: cookieClient.cookieHeader(),
      },
      redirect: "manual",
    });
}

async function assertAdminRoutes(
  requestAsUser: (path: string) => Promise<Response>,
) {
  for (const path of ["/admin", "/admin/content"]) {
    const response = await requestAsUser(path);

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `Verificarea rutei ${path} a fost refuzată (HTTP ${response.status}).`,
      );
    }
  }
}

async function assertOrdinaryUserDenied(
  requestAsUser: (path: string) => Promise<Response>,
) {
  const response = await requestAsUser("/admin");
  const location = response.headers.get("location");

  if (
    response.status < 300 ||
    response.status >= 400 ||
    !location ||
    !new URL(location, "http://local.invalid").pathname.startsWith("/cont")
  ) {
    throw new Error(
      "Utilizatorul obișnuit nu a fost respins controlat de ruta /admin.",
    );
  }
}

async function localProvision() {
  const environment = process.env;
  const supabaseUrl = assertLocalSupabaseUrl(
    requiredEnvironment(environment, "LOCAL_SUPABASE_URL"),
  );
  const appUrl = assertLocalAppUrl(
    requiredEnvironment(environment, "LOCAL_APP_URL"),
  );
  const email = normalizeOperatorEmail(
    requiredEnvironment(environment, "LOCAL_ADMIN_EMAIL"),
  );
  const password = validateLocalAdminPassword(
    requiredEnvironment(environment, "LOCAL_ADMIN_PASSWORD"),
  );
  const displayName = displayNameSchema.parse(
    requiredEnvironment(environment, "LOCAL_ADMIN_DISPLAY_NAME"),
  );
  const adminKey = requiredEnvironment(
    environment,
    "LOCAL_SUPABASE_ADMIN_KEY",
  );
  const publishableKey = requiredEnvironment(
    environment,
    "LOCAL_SUPABASE_PUBLISHABLE_KEY",
  );
  const operatorReference = requiredEnvironment(
    environment,
    "ADMIN_OPERATOR_REFERENCE",
  );
  const reason = requiredEnvironment(environment, "ADMIN_CHANGE_REASON");

  if (environment.CMS_REQUIRE_ADMIN_MFA !== "false") {
    throw new Error(
      "Provisionarea locală cere CMS_REQUIRE_ADMIN_MFA=false în mediul local explicit.",
    );
  }

  const supabase = serviceClient(supabaseUrl, adminKey);
  let user = await resolveExactUser(supabase, email);
  let identityCreated = false;

  if (user) {
    if (user.is_anonymous === true) {
      throw new Error("Identitatea locală existentă este anonimă.");
    }

    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      password,
      user_metadata: {
        ...user.user_metadata,
        full_name: displayName,
      },
    });

    if (error || !data.user) {
      throw new Error(
        `Identitatea locală nu a putut fi actualizată (${error?.code ?? "invalid_response"}).`,
      );
    }

    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      user_metadata: { full_name: displayName },
    });

    if (error || !data.user) {
      throw new Error(
        `Identitatea locală nu a putut fi creată (${error?.code ?? "invalid_response"}).`,
      );
    }

    user = data.user;
    identityCreated = true;
  }

  await callOperatorRpc(
    supabase,
    "cms_operator_set_local_mfa_requirement",
    {
      p_correlation_id: randomUUID(),
      p_operator_reference: operatorReference,
      p_reason: reason,
      p_require_mfa: false,
      p_supabase_url: supabaseUrl,
    },
  );
  await callOperatorRpc(supabase, "cms_operator_grant_admin", {
    p_correlation_id: randomUUID(),
    p_display_name: displayName,
    p_operator_reference: operatorReference,
    p_reason: reason,
    p_user_id: user.id,
  });

  const administratorState = await readProfileAndRole(supabase, user.id);

  if (
    !administratorState.profile ||
    administratorState.role !== "admin" ||
    !user.email_confirmed_at ||
    user.is_anonymous === true
  ) {
    throw new Error("Starea administratorului local nu a putut fi confirmată.");
  }

  const requestAsAdministrator = await signInForRouteVerification({
    appUrl,
    email,
    password,
    publishableKey,
    supabaseUrl,
  });
  await assertAdminRoutes(requestAsAdministrator);

  const ephemeralId = randomUUID();
  const ephemeralEmail = `smartmed-access-check-${ephemeralId}@example.invalid`;
  const ephemeralPassword = `Ephemeral-${ephemeralId}-aA1!`;
  const { data: ephemeralData, error: ephemeralCreateError } =
    await supabase.auth.admin.createUser({
      email: ephemeralEmail,
      email_confirm: true,
      password: ephemeralPassword,
      user_metadata: { full_name: "Verificare acces obișnuit" },
    });

  if (ephemeralCreateError || !ephemeralData.user) {
    throw new Error(
      `Utilizatorul efemer nu a putut fi creat (${ephemeralCreateError?.code ?? "invalid_response"}).`,
    );
  }

  try {
    const ordinaryState = await readProfileAndRole(
      supabase,
      ephemeralData.user.id,
    );

    if (!ordinaryState.profile || ordinaryState.role !== "user") {
      throw new Error(
        "Utilizatorul efemer nu a primit rolul implicit obișnuit.",
      );
    }

    const requestAsOrdinaryUser = await signInForRouteVerification({
      appUrl,
      email: ephemeralEmail,
      password: ephemeralPassword,
      publishableKey,
      supabaseUrl,
    });
    await assertOrdinaryUserDenied(requestAsOrdinaryUser);
  } finally {
    const { error } = await supabase.auth.admin.deleteUser(
      ephemeralData.user.id,
    );

    if (error) {
      throw new Error(
        `Identitatea efemeră nu a putut fi ștearsă (${error.code}).`,
      );
    }
  }

  return {
    command: "local:provision",
    email,
    identityCreated,
    routesVerified: ["/admin", "/admin/content"],
    status: "EXECUTED",
    target: {
      appUrl,
      supabaseUrl,
    },
    userId: user.id,
  };
}

function hostedServiceClient() {
  const target = readHostedTarget(process.env);
  const secret = requiredEnvironment(
    process.env,
    "SUPABASE_OPERATOR_SECRET_KEY",
  );

  return {
    supabase: serviceClient(target.supabaseUrl, secret),
    target,
  };
}

async function hostedInvite() {
  requireHostedExecution(process.env);
  const { supabase, target } = hostedServiceClient();
  const existing = await resolveExactUser(supabase, target.email);

  if (existing) {
    return {
      command: "hosted:invite",
      status: "NO_CHANGE_USER_EXISTS",
      target: publicTargetSummary(target),
      userId: existing.id,
    };
  }

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(
    target.email,
    {
      redirectTo: target.inviteRedirectUrl,
    },
  );

  if (error || !data.user) {
    throw new Error(
      `Invitația hosted a eșuat (${error?.code ?? "invalid_response"}).`,
    );
  }

  return {
    command: "hosted:invite",
    redirect: "/cont?mode=parola-noua",
    status: "EXECUTED_INVITATION_SENT",
    target: publicTargetSummary(target),
    userId: data.user.id,
  };
}

async function requireGrantableHostedUser(
  supabase: SupabaseClient<SmartMedDatabase>,
  email: string,
) {
  const user = await resolveExactUser(supabase, email);

  if (!user) {
    throw new Error(
      "Identitatea hosted exactă nu există. Invitația și acceptarea trebuie finalizate mai întâi.",
    );
  }

  if (!user.email_confirmed_at || user.is_anonymous === true) {
    throw new Error(
      "Identitatea hosted trebuie să fie confirmată și neanonimă înainte de grant.",
    );
  }

  const state = await readProfileAndRole(supabase, user.id);

  if (!state.profile) {
    throw new Error(
      "Profilul aplicației lipsește; grantul hosted a fost refuzat.",
    );
  }

  return { state, user };
}

async function hostedGrant() {
  requireHostedExecution(process.env);
  const { supabase, target } = hostedServiceClient();
  const { user } = await requireGrantableHostedUser(
    supabase,
    target.email,
  );

  await callOperatorRpc(supabase, "cms_operator_grant_admin", {
    p_correlation_id: randomUUID(),
    p_display_name: null,
    p_operator_reference: target.operatorReference,
    p_reason: target.reason,
    p_user_id: user.id,
  });

  const after = await readProfileAndRole(supabase, user.id);

  if (after.role !== "admin") {
    throw new Error("Rolul admin nu a putut fi confirmat după grant.");
  }

  return {
    command: "hosted:grant",
    status: "EXECUTED",
    target: publicTargetSummary(target),
    userId: user.id,
  };
}

async function hostedVerify() {
  const { supabase, target } = hostedServiceClient();
  const user = await resolveExactUser(supabase, target.email);

  if (!user) {
    return {
      command: "hosted:verify",
      status: "NOT_READY_IDENTITY_MISSING",
      target: publicTargetSummary(target),
    };
  }

  const [state, factorsResult] = await Promise.all([
    readProfileAndRole(supabase, user.id),
    supabase.auth.admin.mfa.listFactors({ userId: user.id }),
  ]);

  if (factorsResult.error) {
    throw new Error(
      `Factorii MFA nu au putut fi verificați (${factorsResult.error.code}).`,
    );
  }

  const verifiedTotpCount = factorsResult.data.factors.filter(
    (factor) =>
      factor.factor_type === "totp" && factor.status === "verified",
  ).length;
  const ready =
    Boolean(user.email_confirmed_at) &&
    user.is_anonymous !== true &&
    Boolean(state.profile) &&
    state.role === "admin" &&
    verifiedTotpCount > 0;

  return {
    checks: {
      adminRole: state.role === "admin",
      emailConfirmed: Boolean(user.email_confirmed_at),
      nonAnonymous: user.is_anonymous !== true,
      profileExists: Boolean(state.profile),
      verifiedTotpCount,
    },
    command: "hosted:verify",
    note:
      "AAL2 și accesul interactiv se verifică după autentificare; acest CLI nu solicită parola utilizatorului.",
    status: ready ? "READY_FOR_INTERACTIVE_AAL2_CHECK" : "NOT_READY",
    target: publicTargetSummary(target),
    userId: user.id,
  };
}

async function hostedRevoke() {
  requireHostedExecution(process.env);
  const { supabase, target } = hostedServiceClient();
  const user = await resolveExactUser(supabase, target.email);

  if (!user) {
    throw new Error("Identitatea hosted exactă nu există.");
  }

  await callOperatorRpc(supabase, "cms_operator_revoke_admin", {
    p_correlation_id: randomUUID(),
    p_operator_reference: target.operatorReference,
    p_reason: target.reason,
    p_user_id: user.id,
  });

  const after = await readProfileAndRole(supabase, user.id);

  if (after.role !== "user") {
    throw new Error("Revocarea rolului admin nu a putut fi confirmată.");
  }

  return {
    command: "hosted:revoke",
    note:
      "Rolul a fost revocat imediat. Revocarea sesiunilor și a factorilor rămâne un pas operator separat.",
    status: "EXECUTED",
    target: publicTargetSummary(target),
    userId: user.id,
  };
}

async function main() {
  if (process.argv.length !== 3) {
    throw new Error(
      "Comanda acceptă numai numele operației; credențialele se furnizează exclusiv prin mediu.",
    );
  }

  const command = process.argv[2] as OperatorCommand;

  if (!supportedCommands.has(command)) {
    throw new Error("Comanda de provisionare nu este recunoscută.");
  }

  switch (command) {
    case "local:provision":
      return localProvision();
    case "hosted:invite":
      return hostedInvite();
    case "hosted:grant":
      return hostedGrant();
    case "hosted:verify":
      return hostedVerify();
    case "hosted:revoke":
      return hostedRevoke();
  }
}

try {
  const result = await main();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(
    JSON.stringify(
      {
        message:
          error instanceof Error
            ? error.message
            : "Operația de provisionare a eșuat.",
        status: "FAILED",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
