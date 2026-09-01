import { createFileRoute } from "@tanstack/react-router";

import { ChangePasswordCard } from "@/components/change-password-card";
import { PageHeader } from "@/components/portal-shell";
import { usePortalSession } from "@/hooks/use-portal-session";

export const Route = createFileRoute("/staff/account")({
  head: () => ({
    meta: [
      { title: "Staff Account Security — Joba International Academy" },
      {
        name: "description",
        content: "Manage your staff portal sign-in details and change your password.",
      },
      { property: "og:title", content: "Staff Account Security — Joba International Academy" },
      { property: "og:description", content: "Keep your staff portal account secure." },
    ],
  }),
  component: StaffAccountPage,
});

function StaffAccountPage() {
  const { data: user } = usePortalSession();
  return (
    <div className="space-y-6">
      <PageHeader title="Account & Security" subtitle="Your staff sign-in details" />
      <dl className="grid gap-3 rounded-lg border border-border bg-card p-4 text-sm sm:grid-cols-2 sm:p-6">
        <div>
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-medium">{user?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Staff ID</dt>
          <dd className="font-medium">{user?.id ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-medium break-all">{user?.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Role</dt>
          <dd className="font-medium capitalize">{user?.staffRole ?? "—"}</dd>
        </div>
      </dl>
      <ChangePasswordCard />
    </div>
  );
}
