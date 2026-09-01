import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeading, PublicPage, useSiteSettings } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitHolidayCoaching } from "@/lib/portal.functions";

export const Route = createFileRoute("/holiday-coaching")({
  head: () => ({
    meta: [
      { title: "Holiday Coaching Registration — Joba International Academy" },
      {
        name: "description",
        content:
          "Register a pupil for Joba International Academy holiday coaching in academics, music and ICT.",
      },
      { property: "og:title", content: "Holiday Coaching — Joba International Academy" },
      {
        property: "og:description",
        content: "Vacation classes in academics, music and ICT for JSS and SSS pupils.",
      },
    ],
  }),
  component: HolidayPage,
});

function HolidayPage() {
  const siteSettings = useSiteSettings();
  if (!siteSettings.portal.coachingOpen) {
    return (
      <PublicPage>
        <PageHeading title="Holiday coaching registration is closed" />
        <div className="mx-auto max-w-3xl px-4 py-12">
          <p className="text-muted-foreground">Registration for vacation classes is not open at the moment.</p>
        </div>
      </PublicPage>
    );
  }
  return <HolidayPageForm />;
}

function HolidayPageForm() {

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (done) {
    return (
      <PublicPage>
        <PageHeading title="Registration Complete" />
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-lg border border-border bg-card p-6">
            <p>Registration received. Reference:</p>
            <p className="font-display text-2xl font-bold text-accent">{done}</p>
          </div>
        </div>
      </PublicPage>
    );
  }

  return (
    <PublicPage>
      <PageHeading
        title="Holiday Coaching"
        subtitle="Vacation classes in core academics, music performance and ICT skills."
      />
      <form
        className="mx-auto grid max-w-3xl gap-4 px-4 py-10 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const payload: Record<string, unknown> = {};
          fd.forEach((v, k) => {
            if (String(v).length) payload[k] = v;
          });
          setBusy(true);
          const res = await submitHolidayCoaching({ data: payload });
          setBusy(false);
          if (!res.ok) {
            toast.error(res.error ?? "Submission failed");
            return;
          }
          setDone(res.id);
        }}
      >
        <F name="first_name" label="First name" required />
        <F name="surname" label="Surname" required />
        <F name="gender" label="Gender" />
        <F name="dob" label="Date of birth" type="date" />
        <F name="school_name" label="Current school" />
        <F name="class_applying_for" label="Class / level" required />
        <F name="specialized_track" label="Preferred track" />
        <F name="guardian_name" label="Guardian name" required />
        <F name="guardian_phone" label="Guardian phone" required />
        <F name="guardian_email" label="Guardian email" type="email" required />
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="residential_address">Residential address</Label>
          <Textarea id="residential_address" name="residential_address" />
        </div>
        <Button type="submit" className="sm:col-span-2" disabled={busy}>
          {busy ? "Submitting…" : "Register"}
        </Button>
      </form>
    </PublicPage>
  );
}

function F({
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
