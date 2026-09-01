import { createFileRoute } from "@tanstack/react-router";

import { requireCapability } from "@/lib/route-guards";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { listStudents } from "@/lib/portal.functions";

export const Route = createFileRoute("/staff/students")({
  beforeLoad: () => requireCapability("students.view"),
  head: () => ({
    meta: [
      { title: "Student Register — Joba International Academy" },
      { name: "description", content: "Search the enrolled student register by name, class or ID." },
      { property: "og:title", content: "Student Register — Joba International Academy" },
      { property: "og:description", content: "Enrolled students across JSS and SSS." },
    ],
  }),
  component: StudentsPage,
});

function StudentsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["students"], queryFn: () => listStudents() });
  const [q, setQ] = useState("");

  if (isLoading || !data) return <p className="text-muted-foreground">Loading register…</p>;

  const rows = data.filter((s) =>
    JSON.stringify(s).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Students</h1>
      <Input
        placeholder="Search by name, class or admission ID…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-md"
      />
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              {["Admission ID", "Name", "Class", "Track", "Option", "Email"].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={String(s["admission_id"])} className="border-t border-border">
                <td className="px-3 py-2">{String(s["admission_id"])}</td>
                <td className="px-3 py-2">
                  {String(s["first_name"] ?? "")} {String(s["last_name"] ?? "")}
                </td>
                <td className="px-3 py-2">{String(s["class_level"] ?? "-")}</td>
                <td className="px-3 py-2">{String(s["specialized_track"] ?? "-")}</td>
                <td className="px-3 py-2">{String(s["schooling_option"] ?? "-")}</td>
                <td className="px-3 py-2">{String(s["student_email"] ?? "-")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
