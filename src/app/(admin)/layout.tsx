import { AdminNavbar } from "@/components/layout/AdminNavbar";
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
    <div className="min-h-screen flex flex-col surface-admin">
      <AdminNavbar appName={settings.appName} />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="admin-main max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

