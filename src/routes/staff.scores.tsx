import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listStudents, saveExamScore } from "@/lib/portal.functions";

export const Route = createFileRoute("/staff/scores")({
  head: () => ({
    meta: [
      { title: "Score Entry — Joba International Academy" },
      { name: "description", content: "Record continuous assessment and examination scores per subject." },
      { property: "og:title", content: "Score Entry — Joba International Academy" },
      { property: "og:description", content: "Enter CA and exam scores for enrolled students." },
    ],
  }),
  component: ScoresPage,
});

function ScoresPage() {
  const { data: students } = useQuery({ queryKey: ["students"], queryFn: () => listStudents() });
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Score Entry</h1>
      <form
        className="grid max-w-3xl gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setBusy(true);
          const res = await saveExamScore({
            data: {
              admission_id: String(fd.get("admission_id")),
              subject: String(fd.get("subject")),
              term: String(fd.get("term")),
              session: String(fd.get("session")),
              ca1: Number(fd.get("ca1")),
              ca2: Number(fd.get("ca2")),
              exam: Number(fd.get("exam")),
            },
          });
          setBusy(false);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success(`Saved — total ${res.total} (${res.grade})`);
        }}
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="admission_id">Student</Label>
          <select
            id="admission_id"
            name="admission_id"
            required
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select student…</option>
            {(students ?? []).map((s) => (
              <option key={String(s["admission_id"])} value={String(s["admission_id"])}>
                {String(s["first_name"] ?? "")} {String(s["last_name"] ?? "")} —{" "}
                {String(s["class_level"] ?? "")}
              </option>
            ))}
          </select>
        </div>
        <Num name="subject" label="Subject" type="text" />
        <Num name="session" label="Session (e.g. 2025/2026)" type="text" />
        <div className="space-y-1.5">
          <Label htmlFor="term">Term</Label>
          <select
            id="term"
            name="term"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option>First Term</option>
            <option>Second Term</option>
            <option>Third Term</option>
          </select>
        </div>
        <Num name="ca1" label="CA 1 (max 20)" />
        <Num name="ca2" label="CA 2 (max 20)" />
        <Num name="exam" label="Exam (max 60)" />
        <Button type="submit" disabled={busy} className="sm:col-span-2">
          {busy ? "Saving…" : "Save score"}
        </Button>
      </form>
    </div>
  );
}

function Num({ name, label, type = "number" }: { name: string; label: string; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required defaultValue={type === "number" ? 0 : ""} />
    </div>
  );
}
