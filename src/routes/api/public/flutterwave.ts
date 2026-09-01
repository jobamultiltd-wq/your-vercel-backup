import { createFileRoute } from "@tanstack/react-router";

/**
 * Flutterwave webhook — settles a fee payment server-to-server so the receipt
 * is issued even if the parent never returns to the portal.
 */
export const Route = createFileRoute("/api/public/flutterwave")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["FLUTTERWAVE_WEBHOOK_HASH"] ?? "";
        const supplied = request.headers.get("verif-hash") ?? "";
        if (!expected || supplied !== expected) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: Record<string, unknown>;
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        const nested = (payload["data"] as Record<string, unknown> | undefined) ?? {};
        const txRef = String(nested["tx_ref"] ?? payload["txRef"] ?? "");
        if (!/^JIA-FEE-[A-Za-z0-9-]+$/.test(txRef)) {
          return new Response("ok");
        }

        const { settleFeePayment } = await import("@/lib/payments.server");
        await settleFeePayment(txRef);
        return new Response("ok");
      },
    },
  },
});
