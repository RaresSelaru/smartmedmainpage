import { z } from "zod";

type Environment = Readonly<Record<string, string | undefined>>;

const LOCAL_SUPABASE_ORIGINS = new Set([
  "http://127.0.0.1:54321",
  "http://localhost:54321",
]);

const emailSchema = z.string().trim().email().max(254);
const projectRefSchema = z.string().regex(/^[a-z0-9]{20}$/);

export type HostedOperatorTarget = {
  email: string;
  environment: "production" | "staging";
  inviteRedirectUrl: string;
  operatorReference: string;
  projectRef: string;
  reason: string;
  supabaseUrl: string;
};

export function requiredEnvironment(
  environment: Environment,
  name: string,
): string {
  const value = environment[name]?.trim();

  if (!value) {
    throw new Error(`Lipsește variabila obligatorie ${name}.`);
  }

  return value;
}

function parseExactOrigin(value: string, label: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} nu este un URL valid.`);
  }

  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname !== "/" && parsed.pathname !== "")
  ) {
    throw new Error(`${label} trebuie să conțină doar originea exactă.`);
  }

  return parsed.origin;
}

export function assertLocalSupabaseUrl(value: string): string {
  const origin = parseExactOrigin(value, "LOCAL_SUPABASE_URL");

  if (!LOCAL_SUPABASE_ORIGINS.has(origin)) {
    throw new Error(
      "Provisionarea locală acceptă exclusiv http://localhost:54321 sau http://127.0.0.1:54321.",
    );
  }

  return origin;
}

export function assertLocalAppUrl(value: string): string {
  const origin = parseExactOrigin(value, "LOCAL_APP_URL");
  const parsed = new URL(origin);

  if (
    parsed.protocol !== "http:" ||
    !["localhost", "127.0.0.1"].includes(parsed.hostname)
  ) {
    throw new Error("LOCAL_APP_URL trebuie să fie o origine HTTP locală exactă.");
  }

  return origin;
}

export function normalizeOperatorEmail(value: string): string {
  const parsed = emailSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error("Adresa administratorului este invalidă.");
  }

  return parsed.data.toLowerCase();
}

export function validateLocalAdminPassword(value: string): string {
  if (
    value.length < 14 ||
    !/[a-z]/.test(value) ||
    !/[A-Z]/.test(value) ||
    !/[0-9]/.test(value) ||
    !/[^A-Za-z0-9]/.test(value)
  ) {
    throw new Error(
      "Parola locală trebuie să aibă minimum 14 caractere, literă mică, literă mare, cifră și simbol.",
    );
  }

  return value;
}

export function readHostedTarget(
  environment: Environment,
): HostedOperatorTarget {
  const environmentName = requiredEnvironment(
    environment,
    "ADMIN_BOOTSTRAP_ENVIRONMENT",
  );

  if (environmentName !== "staging" && environmentName !== "production") {
    throw new Error(
      "ADMIN_BOOTSTRAP_ENVIRONMENT trebuie să fie staging sau production.",
    );
  }

  const expectedProjectRef = requiredEnvironment(
    environment,
    "EXPECTED_SUPABASE_PROJECT_REF",
  );
  const actualProjectRef = requiredEnvironment(
    environment,
    "SUPABASE_PROJECT_REF",
  );

  if (
    !projectRefSchema.safeParse(expectedProjectRef).success ||
    !projectRefSchema.safeParse(actualProjectRef).success ||
    expectedProjectRef !== actualProjectRef
  ) {
    throw new Error(
      "Referința proiectului Supabase este invalidă sau nu corespunde exact țintei așteptate.",
    );
  }

  const supabaseUrl = parseExactOrigin(
    requiredEnvironment(environment, "SUPABASE_URL"),
    "SUPABASE_URL",
  );
  const parsedSupabaseUrl = new URL(supabaseUrl);

  if (
    parsedSupabaseUrl.protocol !== "https:" ||
    parsedSupabaseUrl.hostname !== `${actualProjectRef}.supabase.co`
  ) {
    throw new Error(
      "Fluxul hosted acceptă exclusiv originea HTTPS exactă a proiectului Supabase declarat.",
    );
  }

  const inviteRedirectUrl = requiredEnvironment(
    environment,
    "ADMIN_INVITE_REDIRECT_URL",
  );
  let parsedRedirect: URL;

  try {
    parsedRedirect = new URL(inviteRedirectUrl);
  } catch {
    throw new Error("ADMIN_INVITE_REDIRECT_URL este invalid.");
  }

  const allowedHostedApplicationOrigins = new Set([
    "https://smartmedmainpage.vercel.app",
    "https://smartmed.ro",
    "https://www.smartmed.ro",
  ]);

  if (
    parsedRedirect.protocol !== "https:" ||
    !allowedHostedApplicationOrigins.has(parsedRedirect.origin) ||
    parsedRedirect.username ||
    parsedRedirect.password ||
    parsedRedirect.hash ||
    parsedRedirect.pathname !== "/cont" ||
    parsedRedirect.searchParams.size !== 1 ||
    parsedRedirect.searchParams.get("mode") !== "parola-noua"
  ) {
    throw new Error(
      "Redirectul invitației trebuie să fie URL-ul HTTPS exact al fluxului /cont?mode=parola-noua.",
    );
  }

  const operatorReference = requiredEnvironment(
    environment,
    "ADMIN_OPERATOR_REFERENCE",
  );
  const reason = requiredEnvironment(environment, "ADMIN_CHANGE_REASON");

  if (operatorReference.length > 160 || reason.length > 500) {
    throw new Error("Referința operatorului sau motivul depășește limita acceptată.");
  }

  return {
    email: normalizeOperatorEmail(
      requiredEnvironment(environment, "BOOTSTRAP_ADMIN_EMAIL"),
    ),
    environment: environmentName,
    inviteRedirectUrl: parsedRedirect.toString(),
    operatorReference,
    projectRef: actualProjectRef,
    reason,
    supabaseUrl,
  };
}

export function requireHostedExecution(environment: Environment) {
  if (environment.ADMIN_BOOTSTRAP_EXECUTE !== "true") {
    throw new Error(
      "Operația hosted a fost refuzată: ADMIN_BOOTSTRAP_EXECUTE=true lipsește.",
    );
  }
}

export function publicTargetSummary(target: HostedOperatorTarget) {
  return {
    email: target.email,
    environment: target.environment,
    projectRef: target.projectRef,
    supabaseUrl: target.supabaseUrl,
  };
}
