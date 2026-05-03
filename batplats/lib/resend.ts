import { Resend } from "resend";

let resendClient: Resend | null = null;

/** Server-only. Returns null if RESEND_API_KEY is unset (e.g. local build without env). */
export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  resendClient ??= new Resend(key);
  return resendClient;
}
