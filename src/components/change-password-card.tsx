import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/lib/auth.functions";

export function ChangePasswordCard() {
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const newPassword = String(fd.get("newPassword") ?? "");
    if (newPassword !== String(fd.get("confirmPassword") ?? "")) {
      toast.error("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await changePassword({
        data: { currentPassword: String(fd.get("currentPassword") ?? ""), newPassword },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      form.reset();
      toast.success("Password updated.");
    } catch {
      toast.error("Unable to update the password right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-md space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6"
    >
      <div>
        <h2 className="font-display text-lg font-semibold">Change password</h2>
        <p className="text-sm text-muted-foreground">
          Use at least 8 characters. You stay signed in on this device.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" name="newPassword" type="password" minLength={8} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required />
      </div>
      <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
        {busy ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
