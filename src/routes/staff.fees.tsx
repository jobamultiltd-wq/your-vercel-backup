import { createFileRoute } from "@tanstack/react-router";

import { requireCapability } from "@/lib/route-guards";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listFees, listStudents, recordFee } from "@/lib/portal.functions";

export const Route = createFileRoute("/staff/fees")({
  beforeLoad: () => requireCapability("fees.manage"),
  head: () => ({
    meta: [
      { title: "Fees & Bursary — Joba International Academy" },
      { name: "description", content: "Record school fee payments and review collection history." },
      { property: "og:title", content: "Fees & Bursary — Joba International Academy" },
      { property: "og:description", content: "Bursary records for tuition, boarding and levies." },
    ],
  }),
  component: StaffFees,
});

function StaffFees() {
  const fees = useQuery({ queryKey: ["fees"], queryFn: () => listFees() });
  const students = useQuery({ queryKey: ["students"], queryFn: () => listStudents() });
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Fees</h1>

      <form
        className="grid max-w-3xl gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          setBusy(true);
          const res = await recordFee({
            data: {
              admission_id: String(fd.get("admission_id")),
              payment_type: String(fd.get("payment_type")),
              description: String(fd.get("description")),
              amount: Number(fd.get("amount")),
              status: String(fd.get("status")),
            },
          });
          setBusy(false);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success("Payment recorded.");
          form.reset();
          void fees.refetch();
        }}
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="admission_id">Student</Label>
          <select
            id="admission_id"
            name="admission_id"
            required
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select student…</option>
            {(students.data ?? []).map((s) => (
              <option key={String(s["admission_id"])} value={String(s["admission_id"])}>
                {String(s["first_name"] ?? "")} {String(s["last_name"] ?? "")} —{" "}
                {String(s["class_level"] ?? "")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="payment_type">Payment type</Label>
          <select
            id="payment_type"
            name="payment_type"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option>Tuition</option>
            <option>Boarding</option>
            <option>Uniform</option>
            <option>Excursion</option>
            <option>Other Levy</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option>Paid</option>
            <option>Pending</option>
            <option>Part Payment</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount (₦)</Label>
          <Input id="amount" name="amount" type="number" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" required />
        </div>
        <Button type="submit" disabled={busy} className="sm:col-span-2">
          {busy ? "Saving…" : "Record payment"}
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              {["Reference", "Student", "Type", "Amount", "Status"].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(fees.data ?? []).map((f) => (
              <tr key={String(f["id"])} className="border-t border-border">
                <td className="px-3 py-2">{String(f["reference"] ?? "-")}</td>
                <td className="px-3 py-2">{String(f["admission_id"] ?? "-")}</td>
                <td className="px-3 py-2">{String(f["payment_type"] ?? "-")}</td>
                <td className="px-3 py-2">₦{Number(f["amount"] ?? 0).toLocaleString()}</td>
                <td className="px-3 py-2">{String(f["status"] ?? "-")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
