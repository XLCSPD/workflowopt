import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // PKCE flow: exchange the auth code for a session
  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("Auth callback code exchange failed:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  // Implicit flow: Supabase sends tokens via URL hash fragment (#access_token=...).
  // The server can't read hash fragments, so redirect to the target page and let
  // the client-side Supabase SDK pick up the tokens from the hash.
  return NextResponse.redirect(`${origin}${next}`);
}
