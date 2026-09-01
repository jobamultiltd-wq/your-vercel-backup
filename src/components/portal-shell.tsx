import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import logoAsset from "@/assets/logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { logout } from "@/lib/auth.functions";
import type { SessionUser } from "@/lib/auth.functions";

export type NavItem = { to: string; label: string };

function NavLinks({ nav, onNavigate }: { nav: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeOptions={{ exact: item.to.split("/").length <= 2 }}
          activeProps={{
            className: "bg-sidebar-primary text-sidebar-primary-foreground font-semibold",
          }}
          className="rounded px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <img src={logoAsset.url} alt="Academy crest" className="h-9 w-9 shrink-0" />
      <div className="min-w-0 leading-tight">
        <p className="truncate font-display text-sm font-bold">Joba Academy</p>
        <p className="text-[10px] tracking-[0.2em] text-sidebar-primary">PORTAL</p>
      </div>
    </div>
  );
}

export function PortalShell({
  user,
  nav,
  children,
}: {
  user: SessionUser | null;
  nav: NavItem[];
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function signOut() {
    await logout();
    queryClient.clear();
    await navigate({ to: "/login" });
  }

  const identity = (
    <>
      <p className="truncate text-sm font-medium">{user?.name}</p>
      <p className="truncate text-xs text-sidebar-foreground/60">
        {user?.staffRole ?? user?.classLevel ?? user?.role}
      </p>
      <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={signOut}>
        <LogOut className="mr-2 h-4 w-4" /> Sign out
      </Button>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        <Brand />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="shrink-0"
              aria-label="Open portal menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex w-[17rem] flex-col bg-sidebar p-4 text-sidebar-foreground"
          >
            <SheetTitle className="sr-only">Portal navigation</SheetTitle>
            <div className="mb-4">
              <Brand />
            </div>
            <NavLinks nav={nav} onNavigate={() => setOpen(false)} />
            <div className="mt-auto pt-6">{identity}</div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden shrink-0 flex-col gap-1 bg-sidebar p-4 text-sidebar-foreground md:flex md:w-64">
        <div className="mb-4">
          <Brand />
        </div>
        <NavLinks nav={nav} />
        <div className="mt-auto pt-6">{identity}</div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:p-8">{children}</main>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-display text-xl font-bold text-foreground sm:text-2xl">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="sm:justify-self-end">{action}</div> : null}
    </header>
  );
}
