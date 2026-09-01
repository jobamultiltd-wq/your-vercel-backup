import { createFileRoute } from "@tanstack/react-router";

import { ChangePasswordCard } from "@/components/change-password-card";
import { PageHeader } from "@/components/portal-shell";
import { usePortalSession } from "@/hooks/use-portal-session";

export const Route = createFileRoute("/student/account")({
  head: () => ({
    meta: [
      { title: "Account Security — Joba International Academy" },
      {
        name: "description",
        content: "Manage your student portal sign-in details and change your password.",
      },
      { property: "og:title", content: "Account Security — Joba International Academy" },
      { property: "og:description", content: "Keep your student portal account secure." },
    ],
  }),
  component: StudentAccountPage,
});

function StudentAccountPage() {
  const { data: user } = usePortalSession();
  return (
    <div className="space-y-6">
      <PageHeader title="Account & Security" subtitle="Your personal sign-in details" />
      <dl className="grid gap-3 rounded-lg border border-border bg-card p-4 text-sm sm:grid-cols-2 sm:p-6">
        <div>
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-medium">{user?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Admission ID</dt>
          <dd className="font-medium">{user?.id ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Student email</dt>
          <dd className="font-medium break-all">{user?.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Class</dt>
          <dd className="font-medium">{user?.classLevel ?? "—"}</dd>
        </div>
      </dl>
      <ChangePasswordCard />
    </div>
  );
}
