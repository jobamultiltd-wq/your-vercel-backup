import { createServerFn } from "@tanstack/react-start";

export type FeeAccount = {
  configured: boolean;
  studentName: string;
  classLevel: string;
  admissionId: string;
  guardianEmail: string;
  paid: number;
  outstanding: number;
  invoices: Array<{
    id: string;
    reference: string;
    description: string;
    type: string;
    amount: number;
    status: string;
    date: string;
  }>;
};

/** Parent-facing fee account: invoices, receipts and the outstanding balance. */
export const feeAccount = createServerFn({ method: "GET" }).handler(async (): Promise<FeeAccount> => {
  const { getDb, requireParent } = await import("./portal.server");
  const { paymentsConfigured } = await import("./payments.server");
  const parent = await requireParent();
  const db = getDb();
  const id = parent.admissionId!;
  const { data } = await db
    .from("fee_payments")
    .select("*")
    .eq("admission_id", id)
    .order("created_at", { ascending: false });

  const rows = data ?? [];
  const isPaid = (s: unknown) => String(s) === "Paid" || String(s) === "Success";
  return {
    configured: paymentsConfigured(),
    studentName: parent.studentName ?? "",
    classLevel: parent.classLevel ?? "",
    admissionId: id,
    guardianEmail: parent.guardianEmail ?? "",
    paid: rows.filter((r) => isPaid(r["status"])).reduce((s, r) => s + Number(r["amount"] ?? 0), 0),
    outstanding: rows
      .filter((r) => !isPaid(r["status"]) && String(r["status"]) !== "Failed")
      .reduce((s, r) => s + Number(r["amount"] ?? 0), 0),
    invoices: rows.map((r) => ({
      id: String(r["id"]),
      reference: String(r["reference"] ?? ""),
      description: String(r["description"] ?? "School fees"),
      type: String(r["payment_type"] ?? "Tuition"),
      amount: Number(r["amount"] ?? 0),
      status: String(r["status"] ?? "Pending"),
      date: String(r["created_at"] ?? ""),
    })),
  };
});

/**
 * Start a Flutterwave checkout for an outstanding invoice (or a part payment).
 * A pending fee record is written first so the webhook can settle it even if
 * the parent closes the browser on the gateway page.
 */
export const startFeePayment = createServerFn({ method: "POST" })
  .inputValidator((d: { amount: number; invoiceId?: string; note?: string }) => d)
  .handler(async ({ data }) => {
    const { getDb, requireParent } = await import("./portal.server");
    const { feeReference, initFlutterwavePayment } = await import("./payments.server");
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const parent = await requireParent();
    const db = getDb();
    const id = parent.admissionId!;

    const amount = Math.round(Number(data.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 100 || amount > 10_000_000) {
      return { ok: false as const, error: "Enter an amount between ₦100 and ₦10,000,000." };
    }

    let description = data.note?.trim() || "School fees";
    let paymentType = "Tuition";
    if (data.invoiceId) {
      const { data: invoice } = await db
        .from("fee_payments")
        .select("*")
        .eq("id", data.invoiceId)
        .eq("admission_id", id)
        .maybeSingle();
      if (!invoice) return { ok: false as const, error: "That invoice was not found." };
      if (String(invoice["status"]) === "Paid") {
        return { ok: false as const, error: "That invoice has already been paid." };
      }
      description = String(invoice["description"] ?? description);
      paymentType = String(invoice["payment_type"] ?? paymentType);
    }

    const reference = feeReference(id);
    const { error } = await db.from("fee_payments").insert({
      admission_id: id,
      payment_type: paymentType,
      description,
      amount,
      status: "Pending",
      reference,
    });
    if (error) return { ok: false as const, error: error.message };

    const origin = new URL(getRequestUrl()).origin;
    const init = await initFlutterwavePayment({
      txRef: reference,
      amount,
      redirectUrl: `${origin}/parent/fees`,
      customerEmail: parent.guardianEmail ?? "",
      customerName: parent.guardianName ?? "Parent/Guardian",
      description: `${description} — ${parent.studentName ?? id}`,
      meta: { admission_id: id, student: parent.studentName ?? "", class: parent.classLevel ?? "" },
    });
    if (!init.ok) {
      await db.from("fee_payments").update({ status: "Failed" }).eq("reference", reference);
      return { ok: false as const, error: init.error };
    }
    return { ok: true as const, link: init.link, reference };
  });

/** Called when Flutterwave redirects the parent back to the portal. */
export const confirmFeePayment = createServerFn({ method: "POST" })
  .inputValidator((d: { reference: string }) => d)
  .handler(async ({ data }) => {
    const { getDb, requireParent } = await import("./portal.server");
    const { settleFeePayment } = await import("./payments.server");
    const parent = await requireParent();
    const db = getDb();
    const { data: row } = await db
      .from("fee_payments")
      .select("admission_id")
      .eq("reference", data.reference)
      .maybeSingle();
    if (!row || String(row["admission_id"]) !== parent.admissionId) {
      return { ok: false as const, error: "Unknown payment reference." };
    }
    return await settleFeePayment(data.reference);
  });
