/** Flutterwave fee-collection helpers (server-only). */

const FLW_API = "https://api.flutterwave.com/v3";

export function flutterwaveKey() {
  return process.env["FLUTTERWAVE_SECRET_KEY"] ?? "";
}

export function paymentsConfigured() {
  return flutterwaveKey().length > 0;
}

export function feeReference(admissionId: string) {
  return `JIA-FEE-${admissionId}-${Date.now().toString(36).toUpperCase()}`;
}

type InitInput = {
  txRef: string;
  amount: number;
  redirectUrl: string;
  customerEmail: string;
  customerName: string;
  description: string;
  meta: Record<string, string>;
};

/** Create a Flutterwave Standard checkout session; returns the hosted link. */
export async function initFlutterwavePayment(input: InitInput) {
  const key = flutterwaveKey();
  if (!key) return { ok: false as const, error: "Online payments are not configured." };
  try {
    const res = await fetch(`${FLW_API}/payments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tx_ref: input.txRef,
        amount: input.amount,
        currency: "NGN",
        redirect_url: input.redirectUrl,
        payment_options: "card,banktransfer,ussd",
        customer: { email: input.customerEmail, name: input.customerName },
        meta: input.meta,
        customizations: {
          title: "Joba International Academy",
          description: input.description,
          logo: "https://res.cloudinary.com/zdxqwji9/image/upload/v1788291937/joba/brand/school-logo.webp",
        },
      }),
    });
    const json = (await res.json()) as {
      status?: string;
      message?: string;
      data?: { link?: string };
    };
    if (!res.ok || json.status !== "success" || !json.data?.link) {
      return { ok: false as const, error: json.message ?? "Payment gateway rejected the request." };
    }
    return { ok: true as const, link: json.data.link };
  } catch {
    return { ok: false as const, error: "Could not reach the payment gateway." };
  }
}

export type VerifiedPayment = {
  txRef: string;
  amount: number;
  currency: string;
  status: string;
  channel: string;
  customerEmail: string;
  meta: Record<string, unknown>;
};

/** Verify a transaction with Flutterwave by our own reference. */
export async function verifyFlutterwavePayment(
  txRef: string,
): Promise<{ ok: true; payment: VerifiedPayment } | { ok: false; error: string }> {
  const key = flutterwaveKey();
  if (!key) return { ok: false, error: "Online payments are not configured." };
  try {
    const res = await fetch(
      `${FLW_API}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    const json = (await res.json()) as {
      status?: string;
      message?: string;
      data?: Record<string, unknown>;
    };
    const d = json.data;
    if (!res.ok || json.status !== "success" || !d) {
      return { ok: false, error: json.message ?? "Transaction could not be verified." };
    }
    return {
      ok: true,
      payment: {
        txRef: String(d["tx_ref"] ?? txRef),
        amount: Number(d["amount"] ?? 0),
        currency: String(d["currency"] ?? "NGN"),
        status: String(d["status"] ?? "").toLowerCase(),
        channel: String(d["payment_type"] ?? "card"),
        customerEmail: String((d["customer"] as { email?: string } | undefined)?.email ?? ""),
        meta: (d["meta"] as Record<string, unknown>) ?? {},
      },
    };
  } catch {
    return { ok: false, error: "Could not reach the payment gateway." };
  }
}

export function receiptHtml(opts: {
  guardianName: string;
  studentName: string;
  classLevel: string;
  admissionId: string;
  amount: number;
  reference: string;
  description: string;
  channel: string;
  paidAt: string;
  balance: number;
}) {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#6b7280">${label}</td>
      <td style="padding:6px 0;text-align:right;font-weight:bold;color:#14284a">${value}</td></tr>`;
  return `
    <p>Dear ${opts.guardianName},</p>
    <p>We confirm receipt of your school fee payment for
       <strong>${opts.studentName}</strong> (${opts.classLevel}).</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
      ${row("Amount paid", `₦${opts.amount.toLocaleString()}`)}
      ${row("Receipt reference", opts.reference)}
      ${row("Payment for", opts.description)}
      ${row("Channel", opts.channel)}
      ${row("Admission number", opts.admissionId)}
      ${row("Date", opts.paidAt)}
      ${row("Outstanding balance", `₦${Math.max(0, opts.balance).toLocaleString()}`)}
    </table>
    <p>Please keep this receipt for your records. It was generated automatically on payment
       confirmation and is valid without a signature.</p>`;
}
