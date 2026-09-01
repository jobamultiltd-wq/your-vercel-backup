import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { PortalShell } from "@/components/portal-shell";
import { usePortalSession } from "@/hooks/use-portal-session";
import { getSession } from "@/lib/auth.functions";

const NAV = [
  { to: "/student", label: "Dashboard" },
  { to: "/student/subjects", label: "Subject Registration" },
  { to: "/student/assignments", label: "Assignments" },
  { to: "/student/results", label: "Results & Report Card" },
  { to: "/student/fees", label: "Fees" },
];

export const Route = createFileRoute("/student")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getSession();
    if (!user) throw redirect({ to: "/login" });
    if (user.role !== "student") throw redirect({ to: "/staff" });
  },
  component: StudentLayout,
});

function StudentLayout() {
  const { data: user } = usePortalSession();
  return (
    <PortalShell user={user ?? null} nav={NAV}>
      <Outlet />
    </PortalShell>
  );
}
