import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeading, PublicPage, useSiteSettings } from "@/components/site-chrome";
import { UploadField } from "@/components/upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitAdmission } from "@/lib/portal.functions";

export const Route = createFileRoute("/admissions")({
  head: () => ({
    meta: [
      { title: "Admission Application — Joba International Academy" },
      {
        name: "description",
        content:
          "Complete the online admission application for Joba International Academy: JSS and SSS entry, day and boarding options.",
      },
      { property: "og:title", content: "Admission Application — Joba International Academy" },
      {
        property: "og:description",
        content: "Apply online for JSS and SSS placement at Joba International Academy.",
      },
    ],
  }),
  component: AdmissionsPage,
});

const CLASSES = [
  "JSS 1",
  "JSS 2",
  "JSS 3",
  "SSS 1",
  "SSS 2",
  "SSS 3",
];

function Field({
  name,
  label,
  type = "text",
  required = false,
  options,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      {options ? (
        <select
          id={name}
          name={name}
          required={required}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <Input id={name} name={name} type={type} required={required} />
      )}
    </div>
  );
}

function AdmissionsPage() {
  const siteSettings = useSiteSettings();
  if (!siteSettings.portal.admissionsOpen) {
    return (
      <PublicPage>
        <PageHeading title="Admissions are currently closed" />
        <div className="mx-auto max-w-3xl px-4 py-12">
          <p className="text-muted-foreground">Online admission applications are not being accepted at the moment. Please check back soon or contact the Directorate of Academic Affairs.</p>
        </div>
      </PublicPage>
    );
  }

  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [docs, setDocs] = useState<Record<string, string>>({});

  if (reference) {
    return (
      <PublicPage>
        <PageHeading title="Application Submitted" />
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-lg border border-border bg-card p-6">
            <p>Thank you. Your application has been received.</p>
            <p className="mt-3 text-sm text-muted-foreground">Your reference number</p>
            <p className="font-display text-2xl font-bold text-accent">{reference}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              A confirmation email has been sent to the guardian email address provided.
            </p>
          </div>
        </div>
      </PublicPage>
    );
  }

  return (
    <PublicPage>
      <PageHeading
        title="Admission Application"
        subtitle="All fields marked with * are required. Documents are stored securely."
      />
      <form
        className="mx-auto max-w-4xl px-4 py-10"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const payload: Record<string, unknown> = { ...docs };
          fd.forEach((v, k) => {
            if (String(v).length) payload[k] = v;
          });
          if (payload["dob"]) {
            const dob = new Date(String(payload["dob"]));
            payload["age"] = Math.floor((Date.now() - dob.getTime()) / 31557600000);
          }
          setBusy(true);
          const res = await submitAdmission({ data: payload });
          setBusy(false);
          if (!res.ok) {
            toast.error(res.error ?? "Submission failed");
            return;
          }
          setReference(res.id);
        }}
      >
        <Section title="Student Information">
          <Field name="surname" label="Surname" required />
          <Field name="first_name" label="First name" required />
          <Field name="middle_name" label="Middle name" />
          <Field name="dob" label="Date of birth" type="date" required />
          <Field name="gender" label="Gender" required options={["Male", "Female"]} />
          <Field name="nationality" label="Nationality" />
          <Field name="state_of_origin" label="State of origin" required />
          <Field name="lga" label="LGA" required />
        </Section>

        <Section title="Placement">
          <Field name="class_applying_for" label="Class applying for" required options={CLASSES} />
          <Field
            name="schooling_option"
            label="Schooling option"
            required
            options={["Day Schooling", "Boarding"]}
          />
          <Field
            name="specialized_track"
            label="Specialised track"
            options={["Music Conservatory", "ICT Track", "Vocational Trade", "None"]}
          />
          <Field name="academic_session" label="Academic session" />
          <Field name="last_school_attended" label="Last school attended" />
          <Field name="last_class_passed" label="Last class passed" />
        </Section>

        <Section title="Guardian & Contact">
          <Field name="guardian_name" label="Guardian name" required />
          <Field name="relationship_to_applicant" label="Relationship" required />
          <Field name="guardian_phone" label="Guardian phone" required />
          <Field name="guardian_email" label="Guardian email" type="email" required />
          <Field name="guardian_occupation" label="Guardian occupation" />
          <Field name="emergency_contact_name" label="Emergency contact name" />
          <Field name="emergency_contact_phone" label="Emergency contact phone" />
        </Section>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="residential_address">Residential address *</Label>
            <Textarea id="residential_address" name="residential_address" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guardian_address">Guardian address</Label>
            <Textarea id="guardian_address" name="guardian_address" />
          </div>
        </div>

        <Section title="Health Record">
          <Field name="blood_group" label="Blood group" />
          <Field name="genotype" label="Genotype" />
          <Field name="allergies" label="Allergies" />
          <Field name="medical_conditions" label="Medical conditions" />
          <Field name="immunization_status" label="Immunisation status" />
        </Section>

        <Section title="Interests">
          <Field name="music_instrument" label="Music instrument" />
          <Field name="sports_athletics" label="Sports / athletics" />
          <Field name="creative_arts" label="Creative arts" />
          <Field name="vocational_interests" label="Vocational interests" />
          <Field name="leadership_experience" label="Leadership experience" />
        </Section>

        <Section title="Documents">
          <UploadField
            label="Birth certificate"
            folder="admissions"
            onUploaded={(url) => setDocs((d) => ({ ...d, birth_cert_url: url }))}
          />
          <UploadField
            label="Last report card"
            folder="admissions"
            onUploaded={(url) => setDocs((d) => ({ ...d, report_card_url: url }))}
          />
          <UploadField
            label="Passport photograph"
            folder="admissions"
            accept="image/*"
            onUploaded={(url) => setDocs((d) => ({ ...d, passport_photo_url: url }))}
          />
        </Section>

        <Button type="submit" size="lg" className="mt-8" disabled={busy}>
          {busy ? "Submitting…" : "Submit application"}
        </Button>
      </form>
    </PublicPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-8">
      <legend className="mb-3 font-display text-xl font-semibold">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}
