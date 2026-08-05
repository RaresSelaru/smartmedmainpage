import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";

const pendingCenterEnrollmentCookie = "smartmed_pending_center_enrollment";
const pendingLinkLifetimeSeconds = 7 * 24 * 60 * 60;

const followUpTokenSchema = z.uuid();
const linkedEnrollmentReceiptSchema = z.object({
  accepted: z.literal(true),
  linked: z.literal(true),
  profilePrefilled: z.boolean(),
});

function pendingCookieOptions() {
  return {
    httpOnly: true,
    maxAge: pendingLinkLifetimeSeconds,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function rememberPendingCenterEnrollmentLink(
  followUpToken: string,
) {
  const parsed = followUpTokenSchema.safeParse(followUpToken);
  if (!parsed.success) return false;

  const cookieStore = await cookies();
  cookieStore.set(
    pendingCenterEnrollmentCookie,
    parsed.data,
    pendingCookieOptions(),
  );
  return true;
}

export async function consumePendingCenterEnrollmentLink(
  supabase: SupabaseClient<Database>,
) {
  const cookieStore = await cookies();
  const parsed = followUpTokenSchema.safeParse(
    cookieStore.get(pendingCenterEnrollmentCookie)?.value,
  );

  if (!parsed.success) {
    if (cookieStore.has(pendingCenterEnrollmentCookie)) {
      cookieStore.delete(pendingCenterEnrollmentCookie);
    }
    return { linked: false, profilePrefilled: false } as const;
  }

  const linked = await supabase.rpc(
    "link_center_enrollment_to_current_account",
    { p_follow_up_token: parsed.data },
  );
  const receipt = linkedEnrollmentReceiptSchema.safeParse(linked.data);

  if (linked.error || !receipt.success) {
    return { linked: false, profilePrefilled: false } as const;
  }

  cookieStore.delete(pendingCenterEnrollmentCookie);
  return {
    linked: true,
    profilePrefilled: receipt.data.profilePrefilled,
  } as const;
}
