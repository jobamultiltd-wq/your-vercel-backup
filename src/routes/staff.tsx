import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { PortalShell } from "@/components/portal-shell";
import { usePortalSession } from "@/hooks/use-portal-session";
import { getSession } from "@/lib/auth.functions";

const NAV = [
  { to: "/staff", label: "Dashboard" },
  { to: "/staff/attendance", label: "Attendance" },
  { to: "/staff/admissions", label: "Admissions" },
  { to: "/staff/students", label: "Students" },
  { to: "/staff/scores", label: "Score Entry" },
  { to: "/staff/assignments", label: "Assignments" },
  { to: "/staff/notices", label: "Notices" },
  { to: "/staff/fees", label: "Fees" },
  { to: "/staff/notifications", label: "Parent Alerts" },
  { to: "/staff/account", label: "Account & Security" },
];

const ADMIN_NAV = { to: "/staff/admin", label: "Administration" };

export const Route = createFileRoute("/staff")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getSession();
    if (!user) throw redirect({ to: "/login" });
    if (user.role === "student") throw redirect({ to: "/student" });
  },
  component: StaffLayout,
});

function StaffLayout() {
  const { data: user } = usePortalSession();
  const role = (user?.staffRole ?? "").toLowerCase();
  const nav = role === "admin" || role === "principal" ? [...NAV, ADMIN_NAV] : NAV;
  return (
    <PortalShell user={user ?? null} nav={nav}>
      <Outlet />
    </PortalShell>
  );
}
