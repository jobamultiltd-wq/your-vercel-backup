import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { attendanceHistory, clockAttendance } from "@/lib/portal.functions";

export const Route = createFileRoute("/staff/attendance")({
  head: () => ({
    meta: [
      { title: "Staff Attendance — Joba International Academy" },
      { name: "description", content: "Clock in and out and review your attendance history." },
      { property: "og:title", content: "Staff Attendance — Joba International Academy" },
      { property: "og:description", content: "Daily clocking and attendance record." },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const { data, refetch } = useQuery({
    queryKey: ["attendance-history"],
    queryFn: () => attendanceHistory(),
  });
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  async function clock(action: "in" | "out") {
    setBusy(true);
    const res = await clockAttendance({ data: { action, remarks } });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(action === "in" ? "Clocked in." : "Clocked out.");
    setRemarks("");
    void refetch();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Attendance</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-5">
        <div className="min-w-60 flex-1">
          <Input
            placeholder="Remarks (optional)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>
        <Button disabled={busy} onClick={() => clock("in")}>
          Clock in
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => clock("out")}>
          Clock out
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              {["Date", "Clock in", "Clock out", "Hours", "Status"].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => (
              <tr key={String(r["id"])} className="border-t border-border">
                <td className="px-3 py-2">{String(r["date"])}</td>
                <td className="px-3 py-2">{String(r["clock_in_time"] ?? "-")}</td>
                <td className="px-3 py-2">{String(r["clock_out_time"] ?? "-")}</td>
                <td className="px-3 py-2">{String(r["work_duration_hours"] ?? "-")}</td>
                <td className="px-3 py-2">{String(r["status"] ?? "-")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
