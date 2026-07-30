"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CONSENT_BROADCAST_CHANNEL,
  CONSENT_COOKIE_MAX_AGE_SECONDS,
  CONSENT_COOKIE_NAME,
  CONSENT_UPDATED_EVENT,
  createConsentRecord,
  parseConsentRecord,
  REJECT_OPTIONAL_CONSENT,
  serializeConsentRecord,
  withEnabledConsentCategory,
  type ConsentChoices,
  type ConsentRecord,
  type ConsentSource,
  type OptionalConsentCategory,
} from "@/lib/consent";

type ConsentContextValue = {
  choices: ConsentChoices;
  isReady: boolean;
  record: ConsentRecord | null;
  allows: (category: OptionalConsentCategory) => boolean;
  allowCategory: (category: OptionalConsentCategory) => void;
  saveChoices: (choices: ConsentChoices, source: ConsentSource) => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

function readCookieValue(cookieHeader: string) {
  const prefix = `${CONSENT_COOKIE_NAME}=`;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return match?.slice(prefix.length) ?? null;
}

function readBrowserConsent() {
  return parseConsentRecord(readCookieValue(document.cookie));
}

function writeBrowserConsent(record: ConsentRecord) {
  const attributes = [
    `${CONSENT_COOKIE_NAME}=${serializeConsentRecord(record)}`,
    "Path=/",
    `Max-Age=${CONSENT_COOKIE_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
  ];

  if (window.location.protocol === "https:") {
    attributes.push("Secure");
  }

  document.cookie = attributes.join("; ");
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [record, setRecord] = useState<ConsentRecord | null>(null);
  const [isReady, setIsReady] = useState(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      setRecord(readBrowserConsent());
      setIsReady(true);
    }, 0);
    const channel =
      "BroadcastChannel" in window
        ? new BroadcastChannel(CONSENT_BROADCAST_CHANNEL)
        : null;

    if (channel) {
      broadcastChannelRef.current = channel;
      channel.addEventListener("message", () => {
        setRecord(readBrowserConsent());
      });
    }

    return () => {
      window.clearTimeout(hydrationTimer);
      channel?.close();
      broadcastChannelRef.current = null;
    };
  }, []);

  const saveChoices = useCallback(
    (nextChoices: ConsentChoices, source: ConsentSource) => {
      const nextRecord = createConsentRecord(nextChoices, source);

      writeBrowserConsent(nextRecord);
      setRecord(nextRecord);
      window.dispatchEvent(
        new CustomEvent(CONSENT_UPDATED_EVENT, { detail: nextRecord }),
      );
      broadcastChannelRef.current?.postMessage({ type: "consent-updated" });
    },
    [],
  );

  const choices = record?.choices ?? REJECT_OPTIONAL_CONSENT;

  const allows = useCallback(
    (category: OptionalConsentCategory) => choices[category],
    [choices],
  );

  const allowCategory = useCallback(
    (category: OptionalConsentCategory) => {
      saveChoices(
        withEnabledConsentCategory(choices, category),
        "embedded-media",
      );
    },
    [choices, saveChoices],
  );

  const value = useMemo<ConsentContextValue>(
    () => ({
      choices,
      isReady,
      record,
      allows,
      allowCategory,
      saveChoices,
    }),
    [allowCategory, allows, choices, isReady, record, saveChoices],
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);

  if (!context) {
    throw new Error("useConsent must be used inside ConsentProvider.");
  }

  return context;
}
