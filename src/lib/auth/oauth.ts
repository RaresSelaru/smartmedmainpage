import "server-only";

export const oauthProviders = ["google", "facebook"] as const;
export type SmartMedOAuthProvider = (typeof oauthProviders)[number];
export type OAuthProviderAvailability = Record<SmartMedOAuthProvider, boolean>;

function isEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export function getOAuthProviderAvailability(): OAuthProviderAvailability {
  return {
    facebook: isEnabled(process.env.AUTH_FACEBOOK_ENABLED),
    google: isEnabled(process.env.AUTH_GOOGLE_ENABLED),
  };
}
