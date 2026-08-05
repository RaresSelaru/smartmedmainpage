"use server";

import { redirect } from "next/navigation";

import { parseNewsletterUnsubscribeToken } from "@/lib/newsletter/unsubscribe";
import { getPublicServerSupabaseClient } from "@/lib/supabase/public-server";

export async function unsubscribeNewsletterAction(formData: FormData) {
  const token = parseNewsletterUnsubscribeToken(formData.get("token"));

  // Unknown and malformed capabilities intentionally receive the same receipt.
  // This prevents the public endpoint from revealing subscriber membership.
  if (!token) {
    redirect("/newsletter/dezabonare?status=done");
  }

  const supabase = getPublicServerSupabaseClient();
  if (!supabase) {
    redirect("/newsletter/dezabonare?status=unavailable");
  }

  const { error } = await supabase.client.rpc("unsubscribe_newsletter", {
    p_unsubscribe_token: token,
  });

  if (error) {
    console.error("SmartMed newsletter unsubscribe failed", {
      code: error.code,
    });
    redirect("/newsletter/dezabonare?status=unavailable");
  }

  redirect("/newsletter/dezabonare?status=done");
}
