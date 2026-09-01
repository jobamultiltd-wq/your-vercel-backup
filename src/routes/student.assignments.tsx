import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { UploadField } from "@/components/upload-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { studentAssignments, submitAssignment } from "@/lib/portal.functions";

export const Route = createFileRoute("/student/assignments")({
  head: () => ({
    meta: [
      { title: "Assignments — Joba International Academy" },
      { name: "description", content: "View, complete and submit coursework assignments." },
      { property: "og:title", content: "Assignments — Joba International Academy" },
      { property: "og:description", content: "Coursework submissions and grades." },
    ],
  }),
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["student-assignments"],
    queryFn: () => studentAssignments(),
  });
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [fileUrl, setFileUrl] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  if (isLoading || !data) return <p className="text-muted-foreground">Loading assignments…</p>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Assignments</h1>

      {data.available.length === 0 ? (
        <p className="text-muted-foreground">No assignments have been published for your class.</p>
      ) : null}

      <div className="space-y-4">
        {data.available.map((a) => {
          const id = String(a["id"]);
          const mine = data.mine.find((m) => String(m["assignment_id"]) === id);
          return (
            <article key={id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">{String(a["title"])}</h2>
                  <p className="text-sm text-muted-foreground">
                    {String(a["subject"])} · due {new Date(String(a["due_date"])).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded bg-secondary px-2 py-1 text-xs font-medium">
                  {mine ? String(mine["status"]) : "Pending"}
                  {mine?.["score"] != null ? ` · ${String(mine["score"])}` : ""}
                </span>
              </div>
              {a["instructions"] ? (
                <p className="mt-3 text-sm">{String(a["instructions"])}</p>
              ) : null}

              {open === id ? (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <Textarea
                    rows={5}
                    placeholder="Type your answer…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <UploadField
                    label="Attach a file (optional)"
                    folder="assignments"
                    onUploaded={setFileUrl}
                  />
                  <div className="flex gap-2">
                    <Button
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        const res = await submitAssignment({
                          data: { assignmentId: id, text, ...(fileUrl ? { fileUrl } : {}) },
                        });
                        setBusy(false);
                        if (!res.ok) {
                          toast.error(res.error);
                          return;
                        }
                        toast.success("Assignment submitted.");
                        setOpen(null);
                        setText("");
                        setFileUrl(undefined);
                        void refetch();
                      }}
                    >
                      Submit
                    </Button>
                    <Button variant="ghost" onClick={() => setOpen(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button className="mt-4" variant="secondary" onClick={() => setOpen(id)}>
                  {mine?.["status"] === "Submitted" || mine?.["status"] === "Graded"
                    ? "Resubmit"
                    : "Submit work"}
                </Button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
