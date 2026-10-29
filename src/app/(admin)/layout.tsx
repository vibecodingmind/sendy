import { Navbar } from "@/components/layout/Navbar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { getAppSettings } from "@/lib/config";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  const settings = await getAppSettings();

  return (
    <div className="min-h-screen flex flex-col bg-ink-950 text-slate-100">
      <Navbar
        brandName={`${settings.appName} Admin`}
        webmailUrl={settings.mailWebmailUrl}
        variant="dark"
      />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}

