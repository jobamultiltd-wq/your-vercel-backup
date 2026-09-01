import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createNotice, listNotices } from "@/lib/portal.functions";

export const Route = createFileRoute("/staff/notices")({
  head: () => ({
    meta: [
      { title: "Notice Board — Joba International Academy" },
      { name: "description", content: "Publish announcements to students and guardians." },
      { property: "og:title", content: "Notice Board — Joba International Academy" },
      { property: "og:description", content: "School-wide announcements and circulars." },
    ],
  }),
  component: NoticesPage,
});

function NoticesPage() {
  const { data, refetch } = useQuery({ queryKey: ["notices"], queryFn: () => listNotices() });
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Notices</h1>

      <form
        className="grid max-w-3xl gap-4 rounded-lg border border-border bg-card p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          setBusy(true);
          const res = await createNotice({
            data: {
              title: String(fd.get("title")),
              content: String(fd.get("content")),
              type: String(fd.get("type")),
            },
          });
          setBusy(false);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success("Notice published.");
          form.reset();
          void refetch();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            name="type"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option>General</option>
            <option>Academic</option>
            <option>Event</option>
            <option>Urgent</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="content">Content</Label>
          <Textarea id="content" name="content" rows={5} required />
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Publishing…" : "Publish notice"}
        </Button>
      </form>

      <div className="space-y-3">
        {(data ?? []).map((n) => (
          <div key={String(n["id"])} className="rounded-lg border border-border bg-card p-4">
            <p className="font-semibold">{String(n["title"])}</p>
            <p className="text-sm text-muted-foreground">{String(n["content"])}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {String(n["type"] ?? "")} · {String(n["author"] ?? "")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
