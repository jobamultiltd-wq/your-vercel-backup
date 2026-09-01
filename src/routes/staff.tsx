import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { PortalShell } from "@/components/portal-shell";
import { usePortalSession } from "@/hooks/use-portal-session";
import { getSession } from "@/lib/auth.functions";
import { can, type Capability } from "@/lib/permissions";

const NAV: { to: string; label: string; capability?: Capability }[] = [
  { to: "/staff", label: "Dashboard" },
  { to: "/staff/attendance", label: "Attendance", capability: "attendance.clock" },
  { to: "/staff/admissions", label: "Admissions", capability: "admissions.review" },
  { to: "/staff/students", label: "Students", capability: "students.view" },
  { to: "/staff/classes", label: "Class Catalogue", capability: "students.view" },

  { to: "/staff/scores", label: "Score Entry", capability: "scores.enter" },
  { to: "/staff/assignments", label: "Assignments", capability: "assignments.manage" },
  { to: "/staff/notices", label: "Notices", capability: "notices.publish" },
  { to: "/staff/fees", label: "Fees", capability: "fees.manage" },
  { to: "/staff/notifications", label: "Parent Alerts", capability: "parents.notify" },
  { to: "/staff/admin", label: "Administration", capability: "admin.manage" },
  { to: "/staff/account", label: "Account & Security" },
];

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
  const role = user?.staffRole ?? "";
  const nav = NAV.filter((item) => !item.capability || can(role, item.capability)).map(
    ({ to, label }) => ({ to, label }),
  );
  return (
    <PortalShell user={user ?? null} nav={nav}>
      <Outlet />
    </PortalShell>
  );
}
