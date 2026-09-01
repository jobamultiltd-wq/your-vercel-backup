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

const STATUSES = ["Pending", "Under Review", "Interview Scheduled", "Approved", "Rejected"];

function AdmissionsAdmin() {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admissions"],
    queryFn: () => listAdmissions(),
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");

  if (isLoading || !data) return <p className="text-muted-foreground">Loading applications…</p>;

  const rows = filter === "All" ? data : data.filter((a) => a["application_status"] === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Admissions</h1>
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
          return (
            <article key={id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">
                    {String(a["first_name"])} {String(a["surname"])}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {id} · {String(a["class_applying_for"] ?? "")} ·{" "}
                    {String(a["schooling_option"] ?? "")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {String(a["guardian_name"] ?? "")} · {String(a["guardian_phone"] ?? "")} ·{" "}
                    {String(a["guardian_email"] ?? "")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    defaultValue={String(a["application_status"] ?? "Pending")}
                    onChange={async (e) => {
                      setBusy(id);
                      const res = await updateAdmission({
                        data: { id, application_status: e.target.value, notify: true },
                      });
                      setBusy(null);
                      if (res.ok) {
                        toast.success("Status updated and guardian notified.");
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
                    disabled={busy === id}
                    onClick={async () => {
                      setBusy(id);
                      const res = await enrollStudent({ data: { admissionId: id } });
                      setBusy(null);
                      if (res.ok) toast.success(`Enrolled. Login: ${res.email}`);
                      else toast.error(res.error);
                    }}
                  >
                    Enrol & send credentials
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
