import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import logoAsset from "@/assets/logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { getParentUser, parentLogout } from "@/lib/parent.functions";

export const Route = createFileRoute("/parent")({
  component: ParentLayout,
});

const NAV = [
  { to: "/parent/dashboard", label: "Dashboard" },
  { to: "/parent/results", label: "Results & Report Card" },
];

function ParentLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: parent } = useQuery({
    queryKey: ["parent-user"],
    queryFn: () => getParentUser(),
  });

  async function signOut() {
    await parentLogout();
    queryClient.clear();
    await navigate({ to: "/parent" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAsset.src} alt="School crest" className="h-9 w-9" />
            <span className="font-display text-base font-bold">Parent Portal</span>
          </Link>
          {parent ? (
            <>
              <nav className="ml-auto flex items-center gap-1 text-sm">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeProps={{ className: "bg-primary-foreground/15 text-accent" }}
                    className="rounded px-2.5 py-1.5 transition-colors hover:bg-primary-foreground/10"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <Button
                size="sm"
                variant="secondary"
                onClick={signOut}
                className="gap-1.5"
              >
                <LogOut className="h-4 w-4" /> Exit
              </Button>
            </>
          ) : (
            <Link
              to="/login"
              className="ml-auto rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
            >
              Staff / Student login
            </Link>
          )}
        </div>
        {parent ? (
          <div className="border-t border-primary-foreground/10 bg-primary/95 px-4 py-1.5 text-center text-xs text-primary-foreground/80">
            Viewing records for <strong>{parent.studentName}</strong> · {parent.classLevel} ·{" "}
            {parent.admissionId}
          </div>
        ) : null}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
