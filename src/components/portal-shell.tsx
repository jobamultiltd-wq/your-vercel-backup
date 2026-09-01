import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

import logoAsset from "@/assets/logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth.functions";
import type { SessionUser } from "@/lib/auth.functions";

export type NavItem = { to: string; label: string };

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

  async function signOut() {
    await logout();
    queryClient.clear();
    await navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="flex flex-col gap-1 bg-sidebar p-4 text-sidebar-foreground md:w-64">
        <div className="mb-4 flex items-center gap-2">
          <img src={logoAsset.url} alt="Academy crest" className="h-10 w-10" />
          <div className="leading-tight">
            <p className="font-display text-sm font-bold">Joba Academy</p>
            <p className="text-[10px] tracking-[0.2em] text-sidebar-primary">PORTAL</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1 md:flex-col">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to.split("/").length <= 2 }}
              activeProps={{
                className: "bg-sidebar-primary text-sidebar-primary-foreground font-semibold",
              }}
              className="rounded px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-sidebar-foreground/60">
            {user?.staffRole ?? user?.classLevel ?? user?.role}
          </p>
          <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
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
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
