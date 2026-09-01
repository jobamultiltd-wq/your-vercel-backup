import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeading, PublicPage, useSiteSettings } from "@/components/site-chrome";
import { UploadField } from "@/components/upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitCareer } from "@/lib/portal.functions";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers — Joba International Academy" },
      {
        name: "description",
        content:
          "Join the teaching and administrative team at Joba International Academy. Submit your application and CV online.",
      },
      { property: "og:title", content: "Careers — Joba International Academy" },
      {
        property: "og:description",
        content: "Teaching, ICT, music and administrative openings at the academy.",
      },
    ],
  }),
  component: CareersPage,
});

const POSITIONS = [
  "Subject Teacher (JSS)",
  "Subject Teacher (SSS)",
  "Music Instructor",
  "ICT Trainer",
  "Bursary Officer",
  "Administrative Officer",
  "Boarding House Staff",
];

function CareersPage() {
  const siteSettings = useSiteSettings();
  if (!siteSettings.portal.careersOpen) {
    return (
      <PublicPage>
        <PageHeading title="Recruitment is currently closed" />
        <div className="mx-auto max-w-3xl px-4 py-12">
          <p className="text-muted-foreground">There are no open vacancies at the moment. Please check back later.</p>
        </div>
      </PublicPage>
    );
  }
  return <CareersPageForm />;
}

function CareersPageForm() {

  const [busy, setBusy] = useState(false);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (done) {
    return (
      <PublicPage>
        <PageHeading title="Application Received" />
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-lg border border-border bg-card p-6">
            <p>Thank you for applying. Your reference is</p>
            <p className="font-display text-2xl font-bold text-accent">{done}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Shortlisted candidates will be contacted by the Directorate.
            </p>
          </div>
        </div>
      </PublicPage>
    );
  }

  return (
    <PublicPage>
      <PageHeading
        title="Careers at the Academy"
        subtitle="We hire educators devoted to character and academic excellence."
      />
      <form
        className="mx-auto grid max-w-3xl gap-4 px-4 py-10 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const payload: Record<string, unknown> = cvUrl ? { cv_url: cvUrl } : {};
          fd.forEach((v, k) => {
            if (String(v).length) payload[k] = v;
          });
          setBusy(true);
          const res = await submitCareer({ data: payload });
          setBusy(false);
          if (!res.ok) {
            toast.error(res.error ?? "Submission failed");
            return;
          }
          setDone(res.id);
        }}
      >
        <Text name="first_name" label="First name" required />
        <Text name="surname" label="Surname" required />
        <Text name="email" label="Email" type="email" required />
        <Text name="phone" label="Phone" required />
        <div className="space-y-1.5">
          <Label htmlFor="position_applied_for">Position *</Label>
          <select
            id="position_applied_for"
            name="position_applied_for"
            required
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select…</option>
            {POSITIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <Text name="highest_qualification" label="Highest qualification" />
        <Text name="years_of_experience" label="Years of experience" />
        <div className="sm:col-span-2">
          <UploadField
            label="Upload CV (PDF)"
            folder="careers"
            accept="application/pdf"
            onUploaded={setCvUrl}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="cover_letter">Cover letter</Label>
          <Textarea id="cover_letter" name="cover_letter" rows={6} />
        </div>
        <Button type="submit" className="sm:col-span-2" disabled={busy}>
          {busy ? "Submitting…" : "Submit application"}
        </Button>
      </form>
    </PublicPage>
  );
}

function Text({
  name,
  label,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input id={name} name={name} type={type} required={required} />
    </div>
  );
}
