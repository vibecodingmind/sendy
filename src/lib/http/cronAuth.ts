import { NextRequest, NextResponse } from "next/server";
import { isProduction } from "@/lib/env/production";

/**
 * Cron routes must authenticate in production. In development, auth is optional unless CRON_SECRET is set.
 */
export function assertCronAuthorized(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (isProduction() && !cronSecret) {
    return NextResponse.json(
      { error: "Cron authentication is not configured." },
      { status: 503 }
    );
  }

  if (!cronSecret) {
    return null;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
  }

  return null;
}
