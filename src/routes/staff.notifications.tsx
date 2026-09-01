import { createFileRoute } from "@tanstack/react-router";

import { requireCapability } from "@/lib/route-guards";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listGuardianContacts, notifyAttendance, sendFeeReminder } from "@/lib/portal.functions";

export const Route = createFileRoute("/staff/notifications")({
  beforeLoad: () => requireCapability("parents.notify"),
  head: () => ({
    meta: [
      { title: "Parent Alerts — Joba International Academy" },
      {
        name: "description",
        content:
          "Send attendance alerts and school fee reminders straight to parents and guardians.",
      },
      { property: "og:title", content: "Parent Alerts — Joba International Academy" },
      {
        property: "og:description",
        content: "Attendance alerts and fee reminders delivered to guardians.",
      },
    ],
  }),
  component: StaffNotifications,
});

function StudentSelect({ contacts }: { contacts: Record<string, unknown>[] }) {
  return (
    <select
      id="admission_id"
      name="admission_id"
      required
      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
    >
      <option value="">Select student…</option>
      {contacts.map((s) => (
        <option key={String(s["admission_id"])} value={String(s["admission_id"])}>
          {String(s["first_name"] ?? "")} {String(s["last_name"] ?? "")} —{" "}
          {String(s["class_level"] ?? "")}
          {s["guardian_email"] ? "" : " (no guardian email)"}
        </option>
      ))}
    </select>
  );
}

function StaffNotifications() {
  const contacts = useQuery({
    queryKey: ["guardian-contacts"],
    queryFn: () => listGuardianContacts(),
  });
  const [busy, setBusy] = useState(false);
  const list = contacts.data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Parent Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Attendance alerts, fee reminders and admission updates are delivered to the guardian
          e-mail on file.
        </p>
      </div>

      <Tabs defaultValue="attendance">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="attendance" className="flex-1 sm:flex-none">
            Attendance alert
          </TabsTrigger>
          <TabsTrigger value="fees" className="flex-1 sm:flex-none">
            Fee reminder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <form
            className="grid max-w-3xl gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              setBusy(true);
              const res = await notifyAttendance({
                data: {
                  admission_id: String(fd.get("admission_id")),
                  status: String(fd.get("status")) as "Present" | "Late" | "Absent",
                  date: String(fd.get("date")),
                  note: String(fd.get("note") ?? ""),
                },
              });
              setBusy(false);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success(`Alert sent to ${res.email}`);
              form.reset();
            }}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="admission_id">Student</Label>
              <StudentSelect contacts={list} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Attendance status</Label>
              <select
                id="status"
                name="status"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option>Absent</option>
                <option>Late</option>
                <option>Present</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="note">Teacher's note (optional)</Label>
              <Textarea id="note" name="note" rows={3} />
            </div>
            <Button type="submit" disabled={busy} className="sm:col-span-2">
              {busy ? "Sending…" : "Send attendance alert"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="fees">
          <form
            className="grid max-w-3xl gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              setBusy(true);
              const res = await sendFeeReminder({
                data: {
                  admission_id: String(fd.get("admission_id")),
                  amount: Number(fd.get("amount")),
                  due_date: String(fd.get("due_date") ?? ""),
                  note: String(fd.get("note") ?? ""),
                },
              });
              setBusy(false);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success(`Reminder sent to ${res.email}`);
              form.reset();
            }}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="admission_id">Student</Label>
              <StudentSelect contacts={list} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Outstanding amount (₦)</Label>
              <Input id="amount" name="amount" type="number" min="0" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due_date">Due date (optional)</Label>
              <Input id="due_date" name="due_date" type="date" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="note">Message (optional)</Label>
              <Textarea id="note" name="note" rows={3} />
            </div>
            <Button type="submit" disabled={busy} className="sm:col-span-2">
              {busy ? "Sending…" : "Send fee reminder"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
