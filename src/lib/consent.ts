export const CONSENT_COOKIE_NAME = "smartmed_cookie_consent";
export const CONSENT_SCHEMA_VERSION = 1;
export const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
export const OPEN_CONSENT_SETTINGS_EVENT = "smartmed:open-consent-settings";
export const CONSENT_UPDATED_EVENT = "smartmed:consent-updated";
export const CONSENT_BROADCAST_CHANNEL = "smartmed-consent";

export const OPTIONAL_CONSENT_CATEGORIES = [
  "preferences",
  "analytics",
  "externalMedia",
  "marketing",
] as const;

export type OptionalConsentCategory =
  (typeof OPTIONAL_CONSENT_CATEGORIES)[number];

export type ConsentChoices = {
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  externalMedia: boolean;
  marketing: boolean;
};

export type ConsentSource = "banner" | "settings" | "embedded-media";

export type ConsentRecord = {
  version: typeof CONSENT_SCHEMA_VERSION;
  updatedAt: string;
  source: ConsentSource;
  choices: ConsentChoices;
};

export const REJECT_OPTIONAL_CONSENT: ConsentChoices = {
  necessary: true,
  preferences: false,
  analytics: false,
  externalMedia: false,
  marketing: false,
};

export const ACCEPT_ALL_CONSENT: ConsentChoices = {
  necessary: true,
  preferences: true,
  analytics: true,
  externalMedia: true,
  marketing: true,
};

const consentSources = new Set<ConsentSource>([
  "banner",
  "settings",
  "embedded-media",
]);

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function createConsentRecord(
  choices: ConsentChoices,
  source: ConsentSource,
  now = new Date(),
): ConsentRecord {
  return {
    version: CONSENT_SCHEMA_VERSION,
    updatedAt: now.toISOString(),
    source,
    choices: {
      necessary: true,
      preferences: choices.preferences,
      analytics: choices.analytics,
      externalMedia: choices.externalMedia,
      marketing: choices.marketing,
    },
  };
}

export function serializeConsentRecord(record: ConsentRecord): string {
  return encodeURIComponent(JSON.stringify(record));
}

export function parseConsentRecord(
  rawValue: string | null | undefined,
): ConsentRecord | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue)) as Partial<ConsentRecord>;
    const choices = parsed.choices as Partial<ConsentChoices> | undefined;

    if (
      parsed.version !== CONSENT_SCHEMA_VERSION ||
      typeof parsed.updatedAt !== "string" ||
      Number.isNaN(Date.parse(parsed.updatedAt)) ||
      !consentSources.has(parsed.source as ConsentSource) ||
      choices?.necessary !== true ||
      !isBoolean(choices.preferences) ||
      !isBoolean(choices.analytics) ||
      !isBoolean(choices.externalMedia) ||
      !isBoolean(choices.marketing)
    ) {
      return null;
    }

    return {
      version: CONSENT_SCHEMA_VERSION,
      updatedAt: parsed.updatedAt,
      source: parsed.source as ConsentSource,
      choices: {
        necessary: true,
        preferences: choices.preferences,
        analytics: choices.analytics,
        externalMedia: choices.externalMedia,
        marketing: choices.marketing,
      },
    };
  } catch {
    return null;
  }
}

export function withEnabledConsentCategory(
  choices: ConsentChoices,
  category: OptionalConsentCategory,
): ConsentChoices {
  return {
    ...choices,
    necessary: true,
    [category]: true,
  };
}
