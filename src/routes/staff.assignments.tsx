import { createFileRoute } from "@tanstack/react-router";

import { requireCapability } from "@/lib/route-guards";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAssignment, staffOverview } from "@/lib/portal.functions";

export const Route = createFileRoute("/staff/assignments")({
  beforeLoad: () => requireCapability("assignments.manage"),
  head: () => ({
    meta: [
      { title: "Publish Assignments — Joba International Academy" },
      { name: "description", content: "Create coursework assignments for a class and subject." },
      { property: "og:title", content: "Publish Assignments — Joba International Academy" },
      { property: "og:description", content: "Set coursework with due dates and grading weight." },
    ],
  }),
  component: StaffAssignments,
});

function StaffAssignments() {
  const { data, refetch } = useQuery({ queryKey: ["staff-overview"], queryFn: () => staffOverview() });
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Assignments</h1>

      <form
        className="grid max-w-3xl gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          setBusy(true);
          const res = await createAssignment({
            data: {
              title: String(fd.get("title")),
              subject: String(fd.get("subject")),
              class_level: String(fd.get("class_level")),
              due_date: String(fd.get("due_date")),
              total_score: Number(fd.get("total_score")),
              instructions: String(fd.get("instructions")),
            },
          });
          setBusy(false);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success("Assignment published.");
          form.reset();
          void refetch();
        }}
      >
        <T name="title" label="Title" />
        <T name="subject" label="Subject" />
        <T name="class_level" label="Class level (e.g. JSS 2)" />
        <T name="due_date" label="Due date" type="date" />
        <T name="total_score" label="Total score" type="number" />
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="instructions">Instructions</Label>
          <Textarea id="instructions" name="instructions" rows={5} />
        </div>
        <Button type="submit" disabled={busy} className="sm:col-span-2">
          {busy ? "Publishing…" : "Publish assignment"}
        </Button>
      </form>

      <section>
        <h2 className="font-display text-xl font-semibold">Recently published</h2>
        <div className="mt-3 space-y-2">
          {(data?.recentAssignments ?? []).map((a) => (
            <div key={String(a["id"])} className="rounded-lg border border-border bg-card p-4">
              <p className="font-semibold">{String(a["title"])}</p>
              <p className="text-sm text-muted-foreground">
                {String(a["subject"])} · {String(a["class_level"])} · due{" "}
                {String(a["due_date"] ?? "")}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function T({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required />
    </div>
  );
}
