import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import logoAsset from "@/assets/logo.png.asset.json";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/admissions", label: "Admissions" },
  { to: "/holiday-coaching", label: "Holiday Coaching" },
  { to: "/careers", label: "Careers" },
  { to: "/track", label: "Track Application" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoAsset.url} alt="Joba International Academy crest" className="h-11 w-11" />
          <span className="leading-tight">
            <span className="block font-display text-lg font-bold">Joba International Academy</span>
            <span className="block text-[10px] tracking-[0.25em] text-accent">
              VIRTUTE ET DEVOTIONE
            </span>
          </span>
        </Link>
        <nav className="ml-auto flex flex-wrap items-center gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-primary-foreground/15 text-accent" }}
              className="rounded px-3 py-1.5 transition-colors hover:bg-primary-foreground/10"
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/login"
            className="ml-1 rounded bg-accent px-3 py-1.5 font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Portal Login
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-primary py-8 text-primary-foreground">
      <div className="mx-auto max-w-6xl px-4 text-sm">
        <p className="font-display text-base font-semibold">Joba International Academy</p>
        <p className="mt-1 text-primary-foreground/70">
          academy@jobamultiltd.com · Directorate of Academic Affairs
        </p>
        <p className="mt-4 text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} Joba International Academy. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-border bg-secondary/60">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}
