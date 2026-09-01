import { createFileRoute } from "@tanstack/react-router";

import { requireCapability } from "@/lib/route-guards";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { enrollStudent, listAdmissions, updateAdmission } from "@/lib/portal.functions";

export const Route = createFileRoute("/staff/admissions")({
  beforeLoad: () => requireCapability("admissions.review"),
  head: () => ({
    meta: [
      { title: "Admissions Review — Joba International Academy" },
      { name: "description", content: "Review, approve and enrol admission applicants." },
      { property: "og:title", content: "Admissions Review — Joba International Academy" },
      { property: "og:description", content: "Manage the admission pipeline end to end." },
    ],
  }),
  component: AdmissionsAdmin,
});

const STATUSES = [
  "Pending Verification",
  "Paid",
  "Under Review",
  "Approved",
  "Rejected",
  "Enrolled",
];

function AdmissionsAdmin() {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admissions"],
    queryFn: () => listAdmissions(),
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  const [classChoice, setClassChoice] = useState<Record<string, string>>({});

  if (isLoading || !data) return <p className="text-muted-foreground">Loading applications…</p>;

  const classLevels = data.classLevels;
  const rows =
    filter === "All" ? data.rows : data.rows.filter((a) => String(a["payment_status"] ?? "") === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Admissions</h1>
          <p className="text-sm text-muted-foreground">
            Session {data.session} · approve an application, then generate the student account and send
            the enrolment confirmation.
          </p>
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {["All", ...STATUSES].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {rows.map((a) => {
          const id = String(a["id"]);
          const status = String(a["payment_status"] ?? "Pending Verification");
          const enrolled = Boolean(a["enrolled"]);
          const selectedClass = classChoice[id] ?? String(a["class_applying_for"] ?? "");
          return (
            <article key={id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold">
                    {String(a["first_name"])} {String(a["surname"])}
                    {enrolled ? (
                      <span className="ml-2 rounded bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                        Enrolled
                      </span>
                    ) : null}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {id} · {String(a["class_applying_for"] ?? "No class set")} ·{" "}
                    {String(a["schooling_option"] ?? "")} · {status}
                  </p>
                  <p className="break-words text-sm text-muted-foreground">
                    {String(a["guardian_name"] ?? "")} · {String(a["guardian_phone"] ?? "")} ·{" "}
                    {String(a["guardian_email"] ?? "")}
                  </p>
                  {enrolled ? (
                    <p className="text-sm text-muted-foreground">
                      Portal login: {String(a["student_email"])} · Class {String(a["enrolled_class"])}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={selectedClass}
                    onChange={(e) => setClassChoice((c) => ({ ...c, [id]: e.target.value }))}
                  >
                    <option value="">Class…</option>
                    {classLevels.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>

                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={status}
                    onChange={async (e) => {
                      setBusy(id);
                      const res = await updateAdmission({
                        data: { id, application_status: e.target.value, notify: true },
                      });
                      setBusy(null);
                      if (res.ok) {
                        toast.success(
                          res.enrolled
                            ? "Approved — student account created and confirmation email sent."
                            : "Status updated and guardian notified.",
                        );
                        void refetch();
                      } else toast.error(res.error);
                    }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === id || status === "Approved" || enrolled}
                    onClick={async () => {
                      if (!selectedClass) {
                        toast.error("Choose the class the applicant is being placed in.");
                        return;
                      }
                      setBusy(id);
                      const res = await updateAdmission({
                        data: {
                          id,
                          application_status: "Approved",
                          class_applying_for: selectedClass,
                          notify: true,
                        },
                      });
                      setBusy(null);
                      if (res.ok) {
                        if (res.enrolled) {
                          toast.success(
                            `Approved and enrolled — account created (${res.email}) and confirmation email sent.`,
                          );
                        } else if (res.enrolmentError) {
                          toast.warning(`Approved, but account not created: ${res.enrolmentError}`);
                        } else {
                          toast.success("Application approved — guardian notified.");
                        }
                        void refetch();
                      } else toast.error(res.error);
                    }}
                  >
                    Approve &amp; enrol
                  </Button>

                  <Button
                    size="sm"
                    disabled={busy === id || (status !== "Approved" && status !== "Enrolled")}
                    onClick={async () => {
                      setBusy(id);
                      const res = await enrollStudent({
                        data: selectedClass
                          ? { admissionId: id, classLevel: selectedClass }
                          : { admissionId: id },
                      });
                      setBusy(null);
                      if (res.ok) {
                        toast.success(
                          `Enrolled into ${res.classLevel}. Confirmation email sent — login ${res.email}`,
                        );
                        void refetch();
                      } else toast.error(res.error);
                    }}
                  >
                    {enrolled ? "Re-issue credentials" : "Enrol & confirm"}
                  </Button>

                </div>
              </div>
            </article>
          );
        })}
        {rows.length === 0 ? (
          <p className="text-muted-foreground">No applications in this view.</p>
        ) : null}
      </div>
    </div>
  );
}
