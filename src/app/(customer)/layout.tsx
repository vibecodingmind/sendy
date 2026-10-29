import { Navbar } from "@/components/layout/Navbar";
import { CustomerSidebar } from "@/components/layout/CustomerSidebar";
import { CustomerContentWrapper } from "@/components/layout/CustomerContentWrapper";
import { getAppSettings } from "@/lib/config";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const settings = await getAppSettings();

  return (
    <div className="min-h-screen flex flex-col surface-app">
      <Navbar brandName={settings.appName} webmailUrl={settings.mailWebmailUrl} />
      <div className="flex flex-1 overflow-hidden">
        <CustomerSidebar />
        <CustomerContentWrapper>{children}</CustomerContentWrapper>
      </div>
    </div>
  );
}
