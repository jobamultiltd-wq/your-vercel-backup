import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { StatCard } from "@/components/portal-shell";
import { staffOverview } from "@/lib/portal.functions";

export const Route = createFileRoute("/staff/")({
  head: () => ({
    meta: [
      { title: "Staff Dashboard — Joba International Academy" },
      { name: "description", content: "Operational overview of enrolment, admissions and fees." },
      { property: "og:title", content: "Staff Dashboard — Joba International Academy" },
      { property: "og:description", content: "Enrolment, admissions and fee collection at a glance." },
    ],
  }),
  component: StaffDashboard,
});

function StaffDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["staff-overview"], queryFn: () => staffOverview() });

  if (isLoading || !data) return <p className="text-muted-foreground">Loading dashboard…</p>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Welcome, {data.me.name ?? "Staff"}</h1>
        <p className="text-muted-foreground">{data.me.role}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Enrolled students" value={data.studentCount} />
        <StatCard label="Career applications" value={data.careerCount} />
        <StatCard label="Fees collected" value={`₦${data.feesCollected.toLocaleString()}`} />
        <StatCard
          label="Today's attendance"
          value={data.todayAttendance ? String(data.todayAttendance["status"]) : "Not clocked in"}
        />
      </div>

      <section>
        <h2 className="font-display text-xl font-semibold">Recent applications</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                {["Reference", "Applicant", "Class", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentAdmissions.map((a) => (
                <tr key={String(a["id"])} className="border-t border-border">
                  <td className="px-3 py-2">{String(a["id"])}</td>
                  <td className="px-3 py-2">
                    {String(a["first_name"])} {String(a["surname"])}
                  </td>
                  <td className="px-3 py-2">{String(a["class_applying_for"] ?? "-")}</td>
                  <td className="px-3 py-2">{String(a["application_status"] ?? "Pending")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
