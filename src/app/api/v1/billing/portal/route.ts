import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const { organization } = await requireTenantContext();
    const body = await request.json().catch(() => ({}));
    const returnUrl = body.returnUrl || `${request.nextUrl.origin}/billing`;

    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (process.env.PAYMENT_PROVIDER === "stripe" && stripeKey) {
      // Create real Stripe Customer Portal session
      const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          return_url: returnUrl,
          customer: organization.id, // Or customer ID if mapped
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({ url: data.url });
      }
    }

    // Fallback or mock mode simulation
    return NextResponse.json({
      url: `${returnUrl}?portal_simulated=true&org=${organization.slug}`,
      mock: true,
    });
  } catch (err: any) {
    if (err.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Failed to create portal session" }, { status: 500 });
  }
}
