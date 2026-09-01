import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader, StatCard } from "@/components/portal-shell";
import { studentOverview } from "@/lib/portal.functions";

export const Route = createFileRoute("/student/")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — Joba International Academy" },
      { name: "description", content: "Your academic summary, assignments and notices." },
      { property: "og:title", content: "Student Dashboard — Joba International Academy" },
      { property: "og:description", content: "Academic summary for enrolled students." },
    ],
  }),
  component: StudentDashboard,
});

function StudentDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["student-overview"],
    queryFn: () => studentOverview(),
  });

  if (isLoading || !data) return <p className="text-muted-foreground">Loading your dashboard…</p>;

  const scores = data.scores;
  const average =
    scores.length > 0
      ? (scores.reduce((s, r) => s + Number(r["total"] ?? r["score"] ?? 0), 0) / scores.length).toFixed(1)
      : "—";
  const pending = data.assignments.filter((a) => a["status"] === "Pending").length;
  const outstanding = data.fees
    .filter((f) => f["status"] !== "Paid" && f["status"] !== "Success")
    .reduce((s, f) => s + Number(f["amount"] ?? 0), 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={`Welcome, ${String(data.profile?.["first_name"] ?? "Student")}`}
        subtitle={`${String(data.profile?.["class_level"] ?? "")} · ${String(
          data.profile?.["admission_id"] ?? "",
        )}`}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Subjects recorded" value={scores.length} />
        <StatCard label="Term average" value={average} hint="Across recorded subjects" />
        <StatCard label="Pending assignments" value={pending} />
        <StatCard label="Outstanding fees" value={`₦${outstanding.toLocaleString()}`} />
      </div>

      <section>
        <h2 className="font-display text-lg font-semibold sm:text-xl">Latest notices</h2>
        <div className="mt-3 space-y-3">
          {data.notices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notices yet.</p>
          ) : null}
          {data.notices.map((n) => (
            <div key={String(n["id"])} className="rounded-lg border border-border bg-card p-4">
              <p className="font-semibold break-words">{String(n["title"])}</p>
              <p className="text-sm text-muted-foreground break-words">{String(n["content"])}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
