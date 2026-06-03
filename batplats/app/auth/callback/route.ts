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
        let hostDefault = "/dashboard/host";
        if (newProfileRole === "host") {
          const { data: privateListing } = await supabase
            .from("listings")
            .select("id")
            .eq("owner_id", data.user.id)
            .eq("listing_type", "private")
            .maybeSingle();
          if (privateListing) hostDefault = "/mitt-konto";
        }
        const redirectTo =
          safeRedirect ?? (newProfileRole === "host" ? hostDefault : "/dashboard/renter");
        return NextResponse.redirect(new URL(redirectTo, origin));
      }

      const r = profile.role as string | null;
      const isHost = r === "host" || r === "owner";
      let hostDefault = "/dashboard/host";
      if (isHost) {
        const { data: privateListing } = await supabase
          .from("listings")
          .select("id")
          .eq("owner_id", data.user.id)
          .eq("listing_type", "private")
          .maybeSingle();
        if (privateListing) hostDefault = "/mitt-konto";
      }
      const redirectTo = safeRedirect ?? (isHost ? hostDefault : "/dashboard/renter");
      return NextResponse.redirect(new URL(redirectTo, origin));
    }
  }

  return NextResponse.redirect(new URL("/login", origin));
}
