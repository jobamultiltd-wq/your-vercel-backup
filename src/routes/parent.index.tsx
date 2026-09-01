import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestParentCode, verifyParentAccess } from "@/lib/parent.functions";

export const Route = createFileRoute("/parent/")({
  head: () => ({
    meta: [
      { title: "Parent Portal Access — Joba International Academy" },
      {
        name: "description",
        content:
          "Parents and guardians can view their child's dashboard, results and report card using a one-time e-mail access code.",
      },
      { property: "og:title", content: "Parent Portal Access — Joba International Academy" },
      {
        property: "og:description",
        content: "Secure guardian access to your child's academic records — no school account needed.",
      },
    ],
  }),
  component: ParentAccessPage,
});

function ParentAccessPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [admissionId, setAdmissionId] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await requestParentCode({ data: { admissionId, email } });
    setBusy(false);
    toast.success(res.message);
    setStep("verify");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await verifyParentAccess({ data: { admissionId, email, code } });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["parent-user"] });
    await navigate({ to: "/parent/dashboard" });
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Parent &amp; Guardian Access</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        No school account is required. Enter your child&apos;s admission number and the guardian
        e-mail on file — we will send a one-time access code to that address.
      </p>

      <div className="mt-6 rounded-lg border border-border bg-card p-5">
        {step === "request" ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="adm">Student admission number</Label>
              <Input
                id="adm"
                required
                value={admissionId}
                onChange={(e) => setAdmissionId(e.target.value)}
                placeholder="JIA-2026-2201"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mail">Guardian e-mail on file</Label>
              <Input
                id="mail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@example.com"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Sending…" : "Send access code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">6-digit access code</Label>
              <Input
                id="code"
                inputMode="numeric"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                className="text-center text-xl tracking-[0.5em]"
              />
              <p className="text-xs text-muted-foreground">
                Sent to {email}. Codes expire after about 10 minutes.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Checking…" : "View my child's records"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setStep("request")}
            >
              Use different details
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
