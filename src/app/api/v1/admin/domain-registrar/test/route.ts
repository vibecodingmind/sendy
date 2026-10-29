import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/session";
import { getDomainRegistrarProvider } from "@/lib/registrar/DomainRegistrar";

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const provider = await getDomainRegistrarProvider();
    const testResult = await provider.testConnection();

    return NextResponse.json(testResult);
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ success: false, message: error.message || "Connection test failed." }, { status: 500 });
  }
}
