import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import logoAsset from "@/assets/logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loginStaff, loginStudent } from "@/lib/auth.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Portal Login — Joba International Academy" },
      {
        name: "description",
        content: "Sign in to the Joba International Academy student or staff portal.",
      },
      { property: "og:title", content: "Portal Login — Joba International Academy" },
      { property: "og:description", content: "Secure sign-in for students and academy staff." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function handle(kind: "student" | "staff", form: HTMLFormElement) {
    const fd = new FormData(form);
    const payload = {
      identifier: String(fd.get("identifier") ?? ""),
      password: String(fd.get("password") ?? ""),
    };
    setBusy(true);
    try {
      const res =
        kind === "student"
          ? await loginStudent({ data: payload })
          : await loginStaff({ data: payload });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["portal-session"] });
      await navigate({ to: kind === "student" ? "/student" : "/staff" });
    } catch {
      toast.error("Unable to sign in right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-12">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <img src={logoAsset.url} alt="Academy crest" className="h-16 w-16" />
          <h1 className="mt-3 font-display text-2xl font-bold">Academy Portal</h1>
          <p className="text-xs tracking-[0.25em] text-accent">VIRTUTE ET DEVOTIONE</p>
        </div>

        <Tabs defaultValue="student" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="student">Student</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
          </TabsList>

          {(["student", "staff"] as const).map((kind) => (
            <TabsContent key={kind} value={kind}>
              <form
                className="space-y-4 pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handle(kind, e.currentTarget);
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor={`${kind}-id`}>
                    {kind === "student" ? "Admission ID or student email" : "Staff ID or email"}
                  </Label>
                  <Input
                    id={`${kind}-id`}
                    name="identifier"
                    required
                    placeholder={kind === "student" ? "JIA-ADM-XXXX" : "JA-PRIN-001"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${kind}-pw`}>Password</Label>
                  <Input id={`${kind}-pw`} name="password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>
          ))}
        </Tabs>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Trouble signing in? Contact the Directorate at academy@jobamultiltd.com
        </p>
      </div>
    </div>
  );
}
