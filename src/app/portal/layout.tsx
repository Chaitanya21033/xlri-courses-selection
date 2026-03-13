import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PortalSidebar } from "@/components/layout/portal-sidebar";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  const user = session.user as any;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <PortalSidebar
        role={user.role}
        userName={user.name ?? "User"}
        userEmail={user.email ?? ""}
        programme={user.programme}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
