"use client";

import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width={18} height={18} aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.597 32.09 29.11 35 24 35c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.941 4.846 29.196 3 24 3 12.954 3 4 11.954 4 23s8.954 20 20 20 20-8.954 20-20c0-1.341-.132-2.633-.379-3.923z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.941 4.846 29.196 3 24 3 16.318 3 9.656 7.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 43c5.114 0 9.86-1.951 13.409-5.151l-6.191-5.238C29.211 35.091 26.715 36 24 36c-5.114 0-9.602-2.91-11.854-7.133l-6.521 5.019C9.505 39.556 16.227 43 24 43z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.132-2.633-.379-3.923z"
      />
    </svg>
  );
}

type GoogleOAuthButtonProps = {
  /** Passed to /auth/callback — new OAuth users get this profile role */
  newUserRole?: "host" | "renter";
};

export function GoogleOAuthButton({ newUserRole = "renter" }: GoogleOAuthButtonProps) {
  const handleGoogleLogin = async () => {
    const supabase = createClient();
    const redirectTo =
      newUserRole === "host"
        ? `${window.location.origin}/auth/callback?role=host`
        : `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) console.error("Google login error:", error);
  };

  return (
    <button
      type="button"
      onClick={() => void handleGoogleLogin()}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#e2e8f0] bg-white px-4 py-3 text-sm font-semibold text-[#0f172a] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc]"
    >
      <GoogleIcon />
      Fortsätt med Google
    </button>
  );
}

export function AuthOAuthDivider() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-[#94a3b8]" />
      <span className="text-sm text-[#94a3b8]">eller</span>
      <div className="h-px flex-1 bg-[#94a3b8]" />
    </div>
  );
}
