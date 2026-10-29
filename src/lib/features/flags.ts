/**
 * Feature flags for launch-safe behavior (env-driven).
 */

/** Built-in DB webmail + demo inbox seeding — off in production unless explicitly enabled. */
export function isSimulatedWebmailEnabled(): boolean {
  if (process.env.ENABLE_SIMULATED_WEBMAIL === "true") {
    return true;
  }
  if (process.env.ENABLE_SIMULATED_WEBMAIL === "false") {
    return false;
  }
  return process.env.NODE_ENV !== "production";
}