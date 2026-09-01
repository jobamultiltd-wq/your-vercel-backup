/** Client-safe staff capability model for the Joba portal. */

export const CAPABILITIES = [
  "attendance.clock",
  "students.view",
  "admissions.review",
  "admissions.enrol",
  "scores.enter",
  "assignments.manage",
  "notices.publish",
  "fees.manage",
  "parents.notify",
  "admin.manage",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const CAPABILITY_LABELS: Record<Capability, string> = {
  "attendance.clock": "Clock in / out",
  "students.view": "View student register",
  "admissions.review": "Review admission applications",
  "admissions.enrol": "Enrol applicants as students",
  "scores.enter": "Enter CA & exam scores",
  "assignments.manage": "Create assignments",
  "notices.publish": "Publish notices",
  "fees.manage": "Record fee payments",
  "parents.notify": "Send parent alerts",
  "admin.manage": "Administration console",
};

const ALL: Capability[] = [...CAPABILITIES];

/** Role -> capabilities. Roles not listed fall back to the base staff set. */
export const ROLE_PERMISSIONS: Record<string, Capability[]> = {
  admin: ALL,
  principal: ALL,
  registrar: [
    "attendance.clock",
    "students.view",
    "admissions.review",
    "admissions.enrol",
    "notices.publish",
    "parents.notify",
  ],
  bursar: ["attendance.clock", "students.view", "fees.manage", "parents.notify"],
  form_teacher: [
    "attendance.clock",
    "students.view",
    "scores.enter",
    "assignments.manage",
    "notices.publish",
    "parents.notify",
  ],
  teacher: ["attendance.clock", "students.view", "scores.enter", "assignments.manage"],
  counsellor: ["attendance.clock", "students.view", "parents.notify"],
};

export const BASE_STAFF_CAPABILITIES: Capability[] = ["attendance.clock", "students.view"];

export function capabilitiesForRole(role: string | null | undefined): Capability[] {
  const key = (role ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  return ROLE_PERMISSIONS[key] ?? BASE_STAFF_CAPABILITIES;
}

export function can(role: string | null | undefined, capability: Capability): boolean {
  return capabilitiesForRole(role).includes(capability);
}
