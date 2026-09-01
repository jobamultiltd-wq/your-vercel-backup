import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, GraduationCap, Music, Wallet } from "lucide-react";

import logoAsset from "@/assets/logo.png.asset.json";
import { PublicPage } from "@/components/site-chrome";
import { listNotices } from "@/lib/portal.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Joba International Academy — Academic Portal" },
      {
        name: "description",
        content:
          "Apply for admission, track applications, and access the student and staff portal of Joba International Academy.",
      },
      { property: "og:title", content: "Joba International Academy — Academic Portal" },
      {
        property: "og:description",
        content:
          "Admissions, results, bursary and directorate tools for Joba International Academy.",
      },
    ],
  }),
  component: HomePage,
});

const FEATURES = [
  {
    icon: GraduationCap,
    title: "Online Admissions",
    body: "Submit a complete application with documents and receive an instant reference number.",
  },
  {
    icon: BookOpen,
    title: "Student Portal",
    body: "Subject registration, assignments, continuous assessment and downloadable report cards.",
  },
  {
    icon: Music,
    title: "Specialised Tracks",
    body: "Music conservatory, ICT training and vocational trade subjects across JSS and SSS.",
  },
  {
    icon: Wallet,
    title: "Bursary & Records",
    body: "Fee records, staff clock-in attendance and directorate oversight in one place.",
  },
];

function HomePage() {
  const notices = useQuery({ queryKey: ["notices"], queryFn: () => listNotices() });

  return (
    <PublicPage>
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <p className="text-xs tracking-[0.3em] text-accent">EST. EXCELLENCE IN LEARNING</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
              The Official Academic Portal
            </h1>
            <p className="mt-4 max-w-xl text-primary-foreground/80">
              Joba International Academy combines a rigorous Nigerian curriculum with music,
              ICT and vocational tracks. Apply, learn and track progress in one secure portal.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/admissions"
                className="rounded bg-accent px-5 py-2.5 font-semibold text-accent-foreground"
              >
                Apply for Admission
              </Link>
              <Link
                to="/login"
                className="rounded border border-primary-foreground/30 px-5 py-2.5 font-semibold"
              >
                Portal Login
              </Link>
            </div>
          </div>
          <img
            src={logoAsset.url}
            alt="Joba International Academy crest"
            className="mx-auto w-52 drop-shadow-xl"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-2xl font-bold">What the portal offers</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <f.icon className="h-7 w-7 text-accent" />
              <h3 className="mt-3 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6">
        <h2 className="font-display text-2xl font-bold">Notices from the Principal's Office</h2>
        <div className="mt-5 space-y-3">
          {notices.isLoading ? <p className="text-muted-foreground">Loading notices…</p> : null}
          {notices.data?.length === 0 ? (
            <p className="text-muted-foreground">No notices published yet.</p>
          ) : null}
          {notices.data?.map((n) => (
            <article key={String(n["id"])} className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-display text-lg font-semibold">{String(n["title"])}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{String(n["content"])}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {String(n["author"] ?? "")} · {String(n["date_posted"] ?? "")}
              </p>
            </article>
          ))}
        </div>
      </section>
    </PublicPage>
  );
}
