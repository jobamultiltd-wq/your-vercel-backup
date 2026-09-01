import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeading, PublicPage } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackApplication } from "@/lib/portal.functions";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track Your Application — Joba International Academy" },
      {
        name: "description",
        content: "Check the status of a Joba International Academy admission application.",
      },
      { property: "og:title", content: "Track Your Application — Joba International Academy" },
      { property: "og:description", content: "Enter your reference number to see your status." },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const [result, setResult] = useState<Record<string, unknown> | null | "none">("none");
  const [busy, setBusy] = useState(false);

  return (
    <PublicPage>
      <PageHeading
        title="Track Your Application"
        subtitle="Enter the reference number sent to your guardian email after submission."
      />
      <div className="mx-auto max-w-2xl px-4 py-10">
        <form
          className="flex flex-wrap gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setBusy(true);
            const row = await trackApplication({
              data: { reference: String(fd.get("reference") ?? "") },
            });
            setResult(row as Record<string, unknown> | null);
            setBusy(false);
          }}
        >
          <Input name="reference" placeholder="JIA-ADM-XXXXX" required className="flex-1" />
          <Button type="submit" disabled={busy}>
            {busy ? "Checking…" : "Check status"}
          </Button>
        </form>

        {result === null ? (
          <p className="mt-6 rounded border border-destructive/40 bg-destructive/5 p-4 text-sm">
            No application found with that reference.
          </p>
        ) : null}

        {result && result !== "none" ? (
          <div className="mt-6 rounded-lg border border-border bg-card p-5">
            <h2 className="font-display text-xl font-semibold">
              {String(result["first_name"])} {String(result["surname"])}
            </h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <Row label="Reference" value={String(result["id"])} />
              <Row label="Class applied for" value={String(result["class_applying_for"])} />
              <Row
                label="Application status"
                value={String(result["application_status"] ?? result["status"])}
              />
              <Row label="Payment status" value={String(result["payment_status"])} />
            </dl>
          </div>
        ) : null}
      </div>
    </PublicPage>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
