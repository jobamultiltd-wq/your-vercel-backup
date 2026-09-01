import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { getParentUser, parentOverview } from "@/lib/parent.functions";

export const Route = createFileRoute("/parent/dashboard")({
  head: () => ({
    meta: [
      { title: "Child Dashboard — Joba International Academy Parent Portal" },
      {
        name: "description",
        content: "Guardian view of attendance, fees, assignments and academic performance.",
      },
      { property: "og:title", content: "Child Dashboard — Parent Portal" },
      {
        property: "og:description",
        content: "Track your child's attendance, fees and academic progress.",
      },
    ],
  }),
  component: ParentDashboard,
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold sm:text-2xl">{value}</p>
    </div>
  );
}

function ParentDashboard() {
  const navigate = useNavigate();
  const { data: parent, isLoading: loadingUser } = useQuery({
    queryKey: ["parent-user"],
    queryFn: () => getParentUser(),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["parent-overview"],
    queryFn: () => parentOverview(),
    enabled: !!parent,
  });

  useEffect(() => {
    if (!loadingUser && !parent) void navigate({ to: "/parent" });
  }, [loadingUser, parent, navigate]);

  if (loadingUser || !parent) return <p className="text-muted-foreground">Checking access…</p>;
  if (isLoading || !data) return <p className="text-muted-foreground">Loading records…</p>;

  const scores = data.scores;
  const total = scores.reduce((s, r) => s + Number(r["total_score"] ?? 0), 0);
  const average = scores.length ? total / scores.length : 0;
  const att = (data.attendance[0] ?? {}) as Record<string, unknown>;
  const paid = data.fees
    .filter((f) => String(f["status"] ?? "").toLowerCase().includes("paid"))
    .reduce((s, f) => s + Number(f["amount_paid"] ?? f["amount"] ?? 0), 0);
  const outstanding = data.fees.reduce(
    (s, f) => s + Number(f["balance"] ?? f["outstanding"] ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {parent.studentName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {parent.classLevel} · Guardian: {parent.guardianName}
        </p>
      </div>

      {data.admission ? (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-display text-lg font-semibold">Admission status</h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span>
              <span className="text-muted-foreground">Reference: </span>
              <strong>{String(data.admission["id"])}</strong>
            </span>
            <span>
              <span className="text-muted-foreground">Class: </span>
              <strong>{String(data.admission["class_applying_for"] ?? "—")}</strong>
            </span>
            <span>
              <span className="text-muted-foreground">Status: </span>
              <span className="inline-block rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                {String(data.admission["payment_status"] ?? "Pending Verification")}
              </span>
            </span>
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Subjects" value={String(scores.length)} />
        <Stat label="Average" value={scores.length ? `${average.toFixed(1)}%` : "—"} />
        <Stat
          label="Days present"
          value={att["days_present"] != null ? String(att["days_present"]) : "—"}
        />
        <Stat
          label="Fees paid"
          value={paid ? `₦${paid.toLocaleString()}` : "—"}
        />
      </div>

      {outstanding > 0 ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          Outstanding fee balance:{" "}
          <strong>₦{outstanding.toLocaleString()}</strong>. Kindly settle at the bursary.
        </div>
      ) : null}

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-display text-lg font-semibold">Latest subject scores</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[26rem] text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                {["Subject", "Total", "Grade"].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scores.slice(0, 8).map((s) => (
                <tr key={String(s["id"])} className="border-t border-border">
                  <td className="px-3 py-2">{String(s["subject"])}</td>
                  <td className="px-3 py-2 font-semibold">{String(s["total_score"] ?? "-")}</td>
                  <td className="px-3 py-2">{String(s["grade"] ?? "-")}</td>
                </tr>
              ))}
              {scores.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                    No results published yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-display text-lg font-semibold">School notices</h2>
        <ul className="mt-3 space-y-3">
          {data.notices.map((n) => (
            <li key={String(n["id"])} className="border-l-2 border-accent pl-3">
              <p className="font-medium">{String(n["title"] ?? "")}</p>
              <p className="text-sm text-muted-foreground">{String(n["body"] ?? n["content"] ?? "")}</p>
            </li>
          ))}
          {data.notices.length === 0 ? (
            <li className="text-sm text-muted-foreground">No notices at the moment.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
