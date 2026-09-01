import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useSession } from "@tanstack/react-start/server";

/** Service-role Supabase client for the Joba portal database (server-only). */
export function getDb(): SupabaseClient {
  const url = process.env["PORTAL_SUPABASE_URL"];
  const key = process.env["PORTAL_SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Portal database is not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type PortalSession = {
  role?: "student" | "staff";
  id?: string; // admission_id for students, staff_id for staff
  name?: string;
  email?: string;
  staffRole?: string; // admin | bursar | teacher | ...
  classLevel?: string;
};

export function getPortalSession() {
  const password = process.env["PORTAL_SESSION_SECRET"];
  if (!password) throw new Error("Session secret is not configured");
  return useSession<PortalSession>({
    password,
    name: "joba-portal",
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
  });
}

export async function currentUser(): Promise<PortalSession | null> {
  const session = await getPortalSession();
  return session.data?.role ? session.data : null;
}

export async function requireStudent(): Promise<PortalSession> {
  const user = await currentUser();
  if (!user || user.role !== "student") throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireStaff(): Promise<PortalSession> {
  const user = await currentUser();
  if (!user || user.role !== "staff") throw new Error("UNAUTHORIZED");
  return user;
}

/** Passwords in the legacy database are stored either in plain text or as sha256 hex. */
export async function passwordMatches(input: string, stored: string | null) {
  if (!stored) return false;
  if (input === stored) return true;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === stored.trim().toLowerCase();
}

/** Upload a base64 data URL to Cloudinary using a signed request. */
export async function uploadToCloudinary(dataUrl: string, folder: string) {
  const cloud = process.env["CLOUDINARY_CLOUD_NAME"];
  const apiKey = process.env["CLOUDINARY_API_KEY"];
  const apiSecret = process.env["CLOUDINARY_API_SECRET"];
  if (!cloud || !apiKey || !apiSecret) throw new Error("Cloudinary is not configured");

  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(toSign));
  const signature = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const body = new FormData();
  body.append("file", dataUrl);
  body.append("folder", folder);
  body.append("timestamp", String(timestamp));
  body.append("api_key", apiKey);
  body.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, {
    method: "POST",
    body,
  });
  const json = (await res.json()) as { secure_url?: string; error?: { message: string } };
  if (!res.ok || !json.secure_url) {
    throw new Error(json.error?.message ?? "Upload failed");
  }
  return json.secure_url;
}

/** Send a transactional email through Resend. Never throws into the caller flow. */
export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return { sent: false };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Joba International Academy <academy@jobamultiltd.com>",
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    return { sent: res.ok };
  } catch {
    return { sent: false };
  }
}

export function adminEmail() {
  return process.env["ADMIN_NOTIFY_EMAIL"] ?? "admin@jobamultiltd.com";
}

export function emailShell(title: string, bodyHtml: string) {
  return `<div style="font-family:Georgia,serif;background:#f4f6fa;padding:24px">
    <div style="max-width:600px;margin:auto;background:#fff;border-top:6px solid #14284a;padding:28px">
      <h2 style="color:#14284a;margin:0 0 8px">Joba International Academy</h2>
      <p style="color:#a07d21;letter-spacing:2px;margin:0 0 20px;font-size:12px">VIRTUTE ET DEVOTIONE</p>
      <h3 style="color:#14284a">${title}</h3>
      ${bodyHtml}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
      <p style="font-size:12px;color:#6b7280">This is an automated message from the Academy Portal.</p>
    </div>
  </div>`;
}
