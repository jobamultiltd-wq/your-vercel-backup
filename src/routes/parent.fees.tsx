import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmFeePayment, feeAccount, startFeePayment } from "@/lib/payments.functions";

type Search = {
  status?: string | undefined;
  tx_ref?: string | undefined;
  transaction_id?: string | undefined;
};

export const Route = createFileRoute("/parent/fees")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    status: typeof search["status"] === "string" ? search["status"] : undefined,
    tx_ref: typeof search["tx_ref"] === "string" ? search["tx_ref"] : undefined,
    transaction_id:
      typeof search["transaction_id"] === "string" ? search["transaction_id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pay School Fees — Joba International Academy" },
      {
        name: "description",
        content:
          "Parents can pay outstanding school fees securely by card, bank transfer or USSD and receive an instant receipt by e-mail.",
      },
      { property: "og:title", content: "Pay School Fees — Joba International Academy" },
      {
        property: "og:description",
        content: "Settle tuition and levies online and get an instant e-mail receipt.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ParentFees,
});

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

function ParentFees() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const account = useQuery({ queryKey: ["fee-account"], queryFn: () => feeAccount() });

  // Handle the redirect back from the payment gateway.
  useEffect(() => {
    const ref = search.tx_ref;
    if (!ref) return;
    setConfirming(true);
    void (async () => {
      const res = await confirmFeePayment({ data: { reference: ref } });
      setConfirming(false);
      if (res.ok) {
        toast.success(
          res.alreadySettled
            ? "This payment was already confirmed."
            : `Payment of ${naira(res.amount)} confirmed — receipt e-mailed.`,
        );
      } else {
        toast.error(res.error);
      }
      await account.refetch();
      await navigate({ to: "/parent/fees", search: {}, replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.tx_ref]);

  async function pay(payAmount: number, invoiceId?: string) {
    setBusy(true);
    const res = await startFeePayment({
      data: { amount: payAmount, ...(invoiceId ? { invoiceId } : {}), ...(note ? { note } : {}) },
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    window.location.href = res.link;
  }

  if (account.isLoading || !account.data) {
    return <p className="text-muted-foreground">Loading fee account…</p>;
  }
  const data = account.data;
  const openInvoices = data.invoices.filter(
    (i) => i.status !== "Paid" && i.status !== "Success" && i.status !== "Failed",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Pay school fees</h1>
        <p className="text-sm text-muted-foreground">
          {data.studentName} · {data.classLevel} · {data.admissionId}
        </p>
      </div>

      {confirming ? (
        <p className="rounded-lg border border-accent bg-accent/10 p-4 text-sm">
          Confirming your payment with the bank…
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total paid</p>
          <p className="font-display text-2xl font-bold">{naira(data.paid)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Outstanding balance</p>
          <p className="font-display text-2xl font-bold text-accent">{naira(data.outstanding)}</p>
        </div>
      </div>

      {!data.configured ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Online payment is not available at the moment. Please contact the bursary.
        </p>
      ) : (
        <>
          {openInvoices.length ? (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold">Outstanding invoices</h2>
              <ul className="space-y-3">
                {openInvoices.map((i) => (
                  <li
                    key={i.id}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold">{i.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.type} · {i.status}
                        {i.reference ? ` · ${i.reference}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-lg font-bold">{naira(i.amount)}</span>
                      <Button disabled={busy} onClick={() => pay(i.amount, i.id)}>
                        Pay now
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              No outstanding invoice on record. You can still make a part payment or deposit below.
            </p>
          )}

          <form
            className="space-y-4 rounded-lg border border-border bg-card p-5"
            onSubmit={(e) => {
              e.preventDefault();
              void pay(Number(amount));
            }}
          >
            <h2 className="font-display text-lg font-semibold">Make another payment</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (₦)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={100}
                  step={100}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note">Payment for</Label>
                <Input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. 1st Term tuition part payment"
                />
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">
              {busy ? "Opening secure checkout…" : "Pay securely"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Payments are processed by Flutterwave (card, bank transfer or USSD). Your receipt is
              e-mailed to {data.guardianEmail || "the guardian address on file"} the moment the bank
              confirms the payment, with a copy to the bursary.
            </p>
          </form>
        </>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Payment history</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                {["Date", "Reference", "Description", "Amount", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((i) => (
                <tr key={i.id} className="border-t border-border">
                  <td className="px-3 py-2">{i.date ? i.date.slice(0, 10) : "-"}</td>
                  <td className="px-3 py-2">{i.reference || "-"}</td>
                  <td className="px-3 py-2">{i.description}</td>
                  <td className="px-3 py-2">{naira(i.amount)}</td>
                  <td className="px-3 py-2">{i.status}</td>
                </tr>
              ))}
              {data.invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No fee records yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
