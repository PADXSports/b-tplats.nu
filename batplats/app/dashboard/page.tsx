import { redirect } from "next/navigation";

import { createClient } from "@/supabase/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "owner" || profile?.role === "host") {
    redirect("/dashboard/host");
  }

  redirect("/dashboard/renter");
}
