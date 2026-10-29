/** Client-safe feature flags (inlined at build time). */

export function isPublicSimulatedWebmailEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_SIMULATED_WEBMAIL === "true") return true;
  if (process.env.NEXT_PUBLIC_ENABLE_SIMULATED_WEBMAIL === "false") return false;
  return process.env.NODE_ENV !== "production";
}
