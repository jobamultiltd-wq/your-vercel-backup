import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/portal-shell";
import { usePortalSession } from "@/hooks/use-portal-session";
import { listSubjects, saveSubjectRegistration, studentOverview } from "@/lib/portal.functions";

export const Route = createFileRoute("/student/subjects")({
  head: () => ({
    meta: [
      { title: "Subject Registration — Joba International Academy" },
      { name: "description", content: "Register core, elective and trade subjects for the term." },
      { property: "og:title", content: "Subject Registration — Joba International Academy" },
      { property: "og:description", content: "Select your subjects for the academic term." },
    ],
  }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { data: user } = usePortalSession();
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: () => listSubjects() });
  const overview = useQuery({ queryKey: ["student-overview"], queryFn: () => studentOverview() });
  const [selected, setSelected] = useState<string[]>([]);
  const [extras, setExtras] = useState({ trade_subject: "", music_instrument: "", ict_track: "" });
  const [busy, setBusy] = useState(false);

  const registration = overview.data?.registration;
  useEffect(() => {
    if (registration) {
      setSelected((registration["selected_subjects"] as string[]) ?? []);
      setExtras({
        trade_subject: String(registration["trade_subject"] ?? ""),
        music_instrument: String(registration["music_instrument"] ?? ""),
        ict_track: String(registration["ict_track"] ?? ""),
      });
    }
  }, [registration]);

  const section = (user?.classLevel ?? "").toUpperCase().startsWith("SSS") ? "SSS" : "JSS";
  const list = (subjects.data ?? []).filter((s) => s["section"] === section);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subject Registration"
        subtitle={`${section} catalogue for ${user?.classLevel ?? "your class"}.`}
      />

      {!subjects.isLoading && list.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          No subject catalogue has been published for {section} yet. Please check back later.
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((s) => {
          const name = String(s["name"]);
          const checked = selected.includes(name);
          return (
            <label
              key={String(s["id"])}
              className="flex min-w-0 items-start gap-3 rounded-lg border border-border bg-card p-3"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(v) =>
                  setSelected((prev) => (v ? [...prev, name] : prev.filter((p) => p !== name)))
                }
              />
              <span className="min-w-0">
                <span className="block break-words text-sm font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">{String(s["category"])}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="trade">Trade subject</Label>
          <Input
            id="trade"
            value={extras.trade_subject}
            onChange={(e) => setExtras({ ...extras, trade_subject: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="music">Music instrument</Label>
          <Input
            id="music"
            value={extras.music_instrument}
            onChange={(e) => setExtras({ ...extras, music_instrument: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ict">ICT track</Label>
          <Input
            id="ict"
            value={extras.ict_track}
            onChange={(e) => setExtras({ ...extras, ict_track: e.target.value })}
          />
        </div>
      </div>

      <Button
        className="w-full sm:w-auto"
        disabled={busy || selected.length === 0}
        onClick={async () => {
          setBusy(true);
          const res = await saveSubjectRegistration({
            data: { selected_subjects: selected, ...extras },
          });
          setBusy(false);
          if (res.ok) {
            toast.success("Subject registration saved.");
            void overview.refetch();
          } else {
            toast.error(res.error);
          }
        }}
      >
        {busy ? "Saving…" : "Save registration"}
      </Button>
    </div>
  );
}
