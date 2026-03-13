import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PortalRedirectPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  const role = (session.user as any)?.role;

  if (role === "ADMIN") redirect("/portal/admin");
  if (role === "PROFESSOR") redirect("/portal/professor");
  if (role === "STUDENT") redirect("/portal/student");

  redirect("/auth/login");
}
