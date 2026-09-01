import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { requireCapability } from "@/lib/route-guards";
import { classCatalogue } from "@/lib/portal.functions";

export const Route = createFileRoute("/staff/classes")({
  beforeLoad: () => requireCapability("students.view"),
  head: () => ({
    meta: [
      { title: "Class Catalogue — Joba International Academy" },
      {
        name: "description",
        content: "Every class level with enrolled students and incoming applicants awaiting placement.",
      },
      { property: "og:title", content: "Class Catalogue — Joba International Academy" },
      { property: "og:description", content: "Enrolled students and pending applicants per class level." },
    ],
  }),
  component: ClassesPage,
});

function ClassesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["class-catalogue"], queryFn: () => classCatalogue() });

  if (isLoading || !data) return <p className="text-muted-foreground">Loading class catalogue…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Class Catalogue</h1>
        <p className="text-sm text-muted-foreground">
          Session {data.session} · self-applied students appear against the class they chose until they are enrolled.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.classes.map((c) => (
          <section key={c.level} className="rounded-lg border border-border p-4">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">{c.level}</h2>
              <div className="flex gap-2 text-xs">
                <span className="rounded-full bg-secondary px-2 py-1">{c.enrolled.length} enrolled</span>
                <span className="rounded-full bg-accent/10 px-2 py-1 text-accent">
                  {c.applicants.length} applicant{c.applicants.length === 1 ? "" : "s"}
                </span>
              </div>
            </header>

            <ul className="mt-3 space-y-1 text-sm">
              {c.enrolled.map((s) => (
                <li key={s.id} className="flex flex-wrap justify-between gap-2">
                  <span>{s.name || s.id}</span>
                  <span className="text-muted-foreground">{s.id}</span>
                </li>
              ))}
              {c.enrolled.length === 0 && <li className="text-muted-foreground">No enrolled students yet.</li>}
            </ul>

            {c.applicants.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Awaiting placement
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {c.applicants.map((a) => (
                    <li key={a.id} className="flex flex-wrap justify-between gap-2">
                      <span>{a.name || a.id}</span>
                      <span className="text-accent">{a.status}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/staff/admissions" className="mt-2 inline-block text-sm font-medium text-accent underline">
                  Review &amp; enrol →
                </Link>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
