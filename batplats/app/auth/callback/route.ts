import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const roleParam = searchParams.get("role") || "renter";
  const newProfileRole = roleParam === "host" ? "host" : "renter";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      const redirectParam = searchParams.get("redirect");
      const safeRedirect =
        redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
          ? redirectParam
          : null;

      if (!profile) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          role: newProfileRole,
          full_name:
            (data.user.user_metadata?.full_name as string | undefined) ||
            (data.user.user_metadata?.name as string | undefined) ||
            "",
        });
        const redirectTo = safeRedirect ?? "/dashboard/renter";
        return NextResponse.redirect(new URL(redirectTo, origin));
      }

      const redirectTo = safeRedirect ?? "/dashboard/renter";
      return NextResponse.redirect(new URL(redirectTo, origin));
    }
  }

  return NextResponse.redirect(new URL("/login", origin));
}
