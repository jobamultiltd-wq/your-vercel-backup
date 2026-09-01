import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { studentOverview } from "@/lib/portal.functions";

export const Route = createFileRoute("/student/fees")({
  head: () => ({
    meta: [
      { title: "Fees & Payments — Joba International Academy" },
      { name: "description", content: "Review school fee invoices, payments and outstanding balances." },
      { property: "og:title", content: "Fees & Payments — Joba International Academy" },
      { property: "og:description", content: "Your payment history and outstanding balance." },
    ],
  }),
  component: FeesPage,
});

function FeesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["student-overview"],
    queryFn: () => studentOverview(),
  });

  if (isLoading || !data) return <p className="text-muted-foreground">Loading fees…</p>;

  const paid = data.fees
    .filter((f) => f["status"] === "Paid" || f["status"] === "Success")
    .reduce((s, f) => s + Number(f["amount"] ?? 0), 0);
  const due = data.fees
    .filter((f) => f["status"] !== "Paid" && f["status"] !== "Success")
    .reduce((s, f) => s + Number(f["amount"] ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Fees</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total paid</p>
          <p className="font-display text-2xl font-bold">₦{paid.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="font-display text-2xl font-bold text-accent">₦{due.toLocaleString()}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              {["Reference", "Description", "Type", "Amount", "Status"].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.fees.map((f) => (
              <tr key={String(f["id"])} className="border-t border-border">
                <td className="px-3 py-2">{String(f["reference"] ?? "-")}</td>
                <td className="px-3 py-2">{String(f["description"] ?? "-")}</td>
                <td className="px-3 py-2">{String(f["payment_type"] ?? "-")}</td>
                <td className="px-3 py-2">₦{Number(f["amount"] ?? 0).toLocaleString()}</td>
                <td className="px-3 py-2">{String(f["status"] ?? "-")}</td>
              </tr>
            ))}
            {data.fees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No fee records yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
