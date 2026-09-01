import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useSession } from "@tanstack/react-start/server";

import { can, type Capability } from "./permissions";

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

export async function requireAdmin(): Promise<PortalSession> {
  const user = await requireStaff();
  const role = (user.staffRole ?? "").toLowerCase();
  if (role !== "admin" && role !== "principal") throw new Error("FORBIDDEN");
  const db = getDb();
  const { data } = await db
    .from("staff_users")
    .select("id, role, status")
    .eq("staff_id", user.id!)
    .maybeSingle();
  if (!data || data["status"] !== "Active") throw new Error("FORBIDDEN");
  const dbRole = String(data["role"] ?? "").toLowerCase();
  if (dbRole !== "admin" && dbRole !== "principal") throw new Error("FORBIDDEN");
  return { ...user, id: String(data["id"]) };
}

/**
 * Staff guard that re-checks the live staff_users row, so role changes and
 * deactivations made in the admin console take effect immediately.
 */
export async function requirePermission(capability: Capability): Promise<PortalSession> {
  const user = await requireStaff();
  const db = getDb();
  const { data } = await db
    .from("staff_users")
    .select("id, role, status")
    .eq("staff_id", user.id!)
    .maybeSingle();
  if (!data) throw new Error("FORBIDDEN");
  if (String(data["status"] ?? "").toLowerCase() !== "active") throw new Error("FORBIDDEN");
  const dbRole = String(data["role"] ?? "");
  if (!can(dbRole, capability)) throw new Error("FORBIDDEN");
  return { ...user, staffRole: dbRole };
}

/* ------------------------------------------------------------------ */
/* Parent (guardian) access — no school account required               */
/* ------------------------------------------------------------------ */

export type ParentSession = {
  admissionId?: string;
  guardianEmail?: string;
  guardianName?: string;
  studentName?: string;
  classLevel?: string;
};

export function getParentSession() {
  const password = process.env["PORTAL_SESSION_SECRET"];
  if (!password) throw new Error("Session secret is not configured");
  return useSession<ParentSession>({
    password,
    name: "joba-parent",
    maxAge: 60 * 60 * 6,
    cookie: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
  });
}

export async function currentParent(): Promise<ParentSession | null> {
  const session = await getParentSession();
  return session.data?.admissionId ? session.data : null;
}

export async function requireParent(): Promise<ParentSession> {
  const parent = await currentParent();
  if (!parent) throw new Error("UNAUTHORIZED");
  return parent;
}

/** 10-minute rotating window used to derive stateless one-time access codes. */
const PARENT_CODE_WINDOW_MS = 10 * 60 * 1000;

async function parentCodeFor(admissionId: string, email: string, windowIndex: number) {
  const secret = process.env["PORTAL_SESSION_SECRET"] ?? "";
  const digest = await sha256Hex(
    `parent:${secret}:${admissionId.trim().toLowerCase()}:${email.trim().toLowerCase()}:${windowIndex}`,
  );
  const num = parseInt(digest.slice(0, 8), 16) % 1_000_000;
  return num.toString().padStart(6, "0");
}

/** Generate the code for the current window (emailed to the guardian). */
export function currentCodeWindow() {
  return Math.floor(Date.now() / PARENT_CODE_WINDOW_MS);
}

export async function issueParentCode(admissionId: string, email: string) {
  return parentCodeFor(admissionId, email, currentCodeWindow());
}

/** Accept the current or previous window so a code stays valid ~10–20 minutes. */
export async function verifyParentCode(admissionId: string, email: string, code: string) {
  const supplied = code.replace(/\D/g, "");
  if (supplied.length !== 6) return false;
  const now = currentCodeWindow();
  for (const w of [now, now - 1]) {
    if (supplied === (await parentCodeFor(admissionId, email, w))) return true;
  }
  return false;
}



const PBKDF2_ITERATIONS = 100_000;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toHex(new Uint8Array(digest));
}

async function pbkdf2Hex(input: string, saltHex: string, iterations: number) {
  const salt = new Uint8Array((saltHex.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(input), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(new Uint8Array(bits));
}

/** Hash a password for storage: pbkdf2$iterations$salt$digest. */
export async function hashPassword(input: string) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const digest = await pbkdf2Hex(input, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${digest}`;
}

/**
 * Verify a password. Supports the modern pbkdf2 format plus the legacy database
 * values (plain text or sha256 hex) so existing accounts keep working.
 */
export async function passwordMatches(input: string, stored: string | null) {
  if (!stored) return false;
  const value = stored.trim();
  if (value.startsWith("pbkdf2$")) {
    const [, iterRaw, salt, digest] = value.split("$");
    if (!iterRaw || !salt || !digest) return false;
    return (await pbkdf2Hex(input, salt, Number(iterRaw))) === digest;
  }
  if (input === value) return true;
  return (await sha256Hex(input)) === value.toLowerCase();
}

/** True when a stored value still uses a legacy (plain/sha256) format. */
export function isLegacyHash(stored: string | null) {
  return !!stored && !stored.trim().startsWith("pbkdf2$");
}

/** Escape a user-supplied value for use inside a PostgREST `or()` filter. */
export function sanitizeFilterValue(value: string) {
  return value.replace(/[,()"'\\]/g, "").trim();
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
