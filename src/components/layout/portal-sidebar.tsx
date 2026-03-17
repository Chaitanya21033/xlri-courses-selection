"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BookOpen,
  LayoutDashboard,
  Users,
  BookMarked,
  Settings,
  BarChart3,
  Bell,
  LogOut,
  ChevronRight,
  GraduationCap,
  ClipboardList,
  History,
  Trophy,
  FileText,
  Clock,
  TrendingUp,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/portal/admin", icon: LayoutDashboard },
  { label: "Bidding Cycles", href: "/portal/admin/cycles", icon: Clock },
  { label: "Courses", href: "/portal/admin/courses", icon: BookMarked },
  { label: "Import Users", href: "/portal/admin/import", icon: Upload },
  { label: "Students", href: "/portal/admin/students", icon: GraduationCap },
  { label: "Professors", href: "/portal/admin/professors", icon: Users },
  { label: "Rounds", href: "/portal/admin/rounds", icon: ClipboardList },
  { label: "Allocations", href: "/portal/admin/allocations", icon: Trophy },
  { label: "Analytics", href: "/portal/admin/analytics", icon: BarChart3 },
  { label: "Audit Log", href: "/portal/admin/audit", icon: History },
  { label: "Notifications", href: "/portal/admin/notifications", icon: Bell },
  { label: "Settings", href: "/portal/admin/settings", icon: Settings },
];

const professorNav: NavItem[] = [
  { label: "Dashboard", href: "/portal/professor", icon: LayoutDashboard },
  { label: "My Courses", href: "/portal/professor/courses", icon: BookMarked },
  { label: "Demand Analytics", href: "/portal/professor/demand", icon: TrendingUp },
  { label: "Notifications", href: "/portal/professor/notifications", icon: Bell },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/portal/student", icon: LayoutDashboard },
  { label: "Course Catalog", href: "/portal/student/catalog", icon: BookMarked },
  { label: "My Bids", href: "/portal/student/bids", icon: ClipboardList },
  { label: "My Allocations", href: "/portal/student/allocations", icon: Trophy },
  { label: "Bid History", href: "/portal/student/history", icon: History },
  { label: "Notifications", href: "/portal/student/notifications", icon: Bell },
  { label: "Summary", href: "/portal/student/summary", icon: FileText },
];

interface PortalSidebarProps {
  role: string;
  userName: string;
  userEmail: string;
  programme?: string | null;
}

export function PortalSidebar({
  role,
  userName,
  userEmail,
  programme,
}: PortalSidebarProps) {
  const pathname = usePathname();

  const nav =
    role === "ADMIN"
      ? adminNav
      : role === "PROFESSOR"
      ? professorNav
      : studentNav;

  const roleLabel =
    role === "ADMIN"
      ? "Administrator"
      : role === "PROFESSOR"
      ? "Faculty"
      : `Student · ${programme ?? ""}`;

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="h-8 w-8 rounded-lg bg-indigo-700 flex items-center justify-center flex-shrink-0">
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-none">BidScholar</p>
          <p className="text-xs text-slate-500 mt-0.5">{roleLabel}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {nav.map((item) => {
            const isActive =
              item.href === `/portal/${role.toLowerCase()}`
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      isActive ? "text-indigo-600" : "text-slate-400"
                    )}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-indigo-400" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-indigo-700">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{userName}</p>
            <p className="text-xs text-slate-400 truncate">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
