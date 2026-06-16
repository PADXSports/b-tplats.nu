/** Resolves the app origin with a guaranteed http(s) scheme for server-side URL building. */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const url = process.env.NEXT_PUBLIC_APP_URL.trim();
    const withScheme = url.startsWith("http") ? url : `https://${url}`;
    return withScheme.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}
