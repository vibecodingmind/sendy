import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { LandingPage } from "@/components/marketing/LandingPage";

export default async function HomePage() {
  const session = await getCurrentSession();
  if (session?.role === "SUPER_ADMIN") {
    redirect("/admin");
  }
  if (session) {
    redirect("/dashboard");
  }
  return <LandingPage />;
}
