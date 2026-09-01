import { createServerFn } from "@tanstack/react-start";

export type ParentUser = {
  admissionId: string;
  guardianEmail: string;
  guardianName: string;
  studentName: string;
  classLevel: string;
};

/** Escape PostgREST filter values so guardian input cannot alter the query. */
function safe(value: string) {
  return value.replace(/[(),*"'\\]/g, "").trim();
}

/**
 * Step 1 — a guardian proves ownership of the e-mail on file by asking for a
 * one-time access code. The response is always generic so the endpoint cannot
 * be used to enumerate students or guardian addresses.
 */
export const requestParentCode = createServerFn({ method: "POST" })
  .inputValidator((d: { admissionId: string; email: string }) => d)
  .handler(async ({ data }) => {
    const { getDb, issueParentCode, sendEmail, emailShell } = await import("./portal.server");
    const generic = {
      ok: true as const,
      message:
        "If those details match our records, a 6-digit access code has been e-mailed to the guardian address on file.",
    };
    const admissionId = safe(data.admissionId);
    const email = safe(data.email).toLowerCase();
    if (!admissionId || !email) return generic;

    const db = getDb();
    const { data: profile } = await db
      .from("student_profiles")
      .select("admission_id, guardian_email, first_name, last_name, class_level")
      .eq("admission_id", admissionId)
      .maybeSingle();
    if (!profile) return generic;

    const { data: admission } = await db
      .from("admissions")
      .select("guardian_email, guardian_name")
      .eq("id", admissionId)
      .maybeSingle();

    const onFile = [profile["guardian_email"], admission?.["guardian_email"]]
      .filter(Boolean)
      .map((v) => String(v).trim().toLowerCase());
    if (!onFile.includes(email)) return generic;

    const code = await issueParentCode(admissionId, email);
    const studentName = `${profile["first_name"] ?? ""} ${profile["last_name"] ?? ""}`.trim();
    await sendEmail({
      to: email,
      subject: `Parent portal access code — ${studentName}`,
      html: emailShell(
        "Your parent portal access code",
        `<p>Dear ${admission?.["guardian_name"] ?? "Parent/Guardian"},</p>
         <p>Use this code to view <strong>${studentName}</strong>'s dashboard, results and report card:</p>
         <p style="font-size:30px;letter-spacing:8px;font-weight:bold;color:#14284a">${code}</p>
         <p>The code expires in about 10 minutes. If you did not request it, you can ignore this e-mail.</p>`,
      ),
    });
    return generic;
  });

/** Step 2 — exchange the code for a guardian session scoped to one child. */
export const verifyParentAccess = createServerFn({ method: "POST" })
  .inputValidator((d: { admissionId: string; email: string; code: string }) => d)
  .handler(async ({ data }) => {
    const { getDb, verifyParentCode, getParentSession } = await import("./portal.server");
    const admissionId = safe(data.admissionId);
    const email = safe(data.email).toLowerCase();
    const invalid = { ok: false as const, error: "That code is incorrect or has expired." };
    if (!(await verifyParentCode(admissionId, email, data.code))) return invalid;

    const db = getDb();
    const { data: profile } = await db
      .from("student_profiles")
      .select("admission_id, guardian_email, first_name, last_name, class_level")
      .eq("admission_id", admissionId)
      .maybeSingle();
    if (!profile) return invalid;

    const { data: admission } = await db
      .from("admissions")
      .select("guardian_email, guardian_name")
      .eq("id", admissionId)
      .maybeSingle();
    const onFile = [profile["guardian_email"], admission?.["guardian_email"]]
      .filter(Boolean)
      .map((v) => String(v).trim().toLowerCase());
    if (!onFile.includes(email)) return invalid;

    const session = await getParentSession();
    await session.update({
      admissionId,
      guardianEmail: email,
      guardianName: String(admission?.["guardian_name"] ?? "Parent/Guardian"),
      studentName: `${profile["first_name"] ?? ""} ${profile["last_name"] ?? ""}`.trim(),
      classLevel: String(profile["class_level"] ?? ""),
    });
    return { ok: true as const };
  });

export const getParentUser = createServerFn({ method: "GET" }).handler(async () => {
  const { currentParent } = await import("./portal.server");
  const parent = await currentParent();
  if (!parent?.admissionId) return null;
  return {
    admissionId: parent.admissionId,
    guardianEmail: parent.guardianEmail ?? "",
    guardianName: parent.guardianName ?? "",
    studentName: parent.studentName ?? "",
    classLevel: parent.classLevel ?? "",
  } satisfies ParentUser;
});

export const parentLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { getParentSession } = await import("./portal.server");
  const session = await getParentSession();
  await session.clear();
  return { ok: true as const };
});

/** Child summary: academics, fees, attendance and notices — read-only. */
export const parentOverview = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb, requireParent } = await import("./portal.server");
  const parent = await requireParent();
  const db = getDb();
  const id = parent.admissionId!;
  const [profile, scores, fees, attendance, notices, assignments] = await Promise.all([
    db.from("student_profiles").select("*").eq("admission_id", id).maybeSingle(),
    db.from("exam_scores").select("*").eq("admission_id", id),
    db.from("fee_payments").select("*").eq("admission_id", id),
    db.from("attendance_records").select("*").eq("admission_id", id),
    db.from("notices").select("*").order("created_at", { ascending: false }).limit(5),
    db.from("student_assignments").select("*").eq("admission_id", id),
  ]);
  return {
    profile: profile.data,
    scores: scores.data ?? [],
    fees: fees.data ?? [],
    attendance: attendance.data ?? [],
    notices: notices.data ?? [],
    assignments: assignments.data ?? [],
  };
});

/** Same payload the student results page uses, scoped to the guardian's child. */
export const parentResults = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb, requireParent } = await import("./portal.server");
  const parent = await requireParent();
  const db = getDb();
  const id = parent.admissionId!;
  const [scores, reports, profile, attendance, admission] = await Promise.all([
    db.from("exam_scores").select("*").eq("admission_id", id).order("subject"),
    db.from("student_term_reports").select("*").eq("admission_id", id),
    db.from("student_profiles").select("*").eq("admission_id", id).maybeSingle(),
    db.from("attendance_records").select("*").eq("admission_id", id),
    db.from("admissions").select("gender, age, date_of_birth").eq("id", id).maybeSingle(),
  ]);
  return {
    scores: scores.data ?? [],
    reports: reports.data ?? [],
    profile: profile.data ? { ...profile.data, ...(admission.data ?? {}) } : admission.data,
    attendance: attendance.data ?? [],
  };
});
