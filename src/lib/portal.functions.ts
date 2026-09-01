import { createServerFn } from "@tanstack/react-start";

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

export const uploadFile = createServerFn({ method: "POST" })
  .inputValidator((d: { dataUrl: string; folder: string }) => d)
  .handler(async ({ data }) => {
    const { uploadToCloudinary } = await import("./portal.server");
    const url = await uploadToCloudinary(data.dataUrl, `joba/${data.folder}`);
    return { url };
  });

export const listNotices = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb } = await import("./portal.server");
  const { data } = await getDb()
    .from("notices")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
});

export const listSubjects = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb } = await import("./portal.server");
  const { data } = await getDb().from("academic_subjects").select("*").order("name");
  return data ?? [];
});

/* ------------------------------------------------------------------ */
/* Public applications                                                 */
/* ------------------------------------------------------------------ */

function refId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

/** Columns that actually exist on public.admissions. */
const ADMISSION_COLUMNS = new Set([
  "surname","first_name","other_name","date_of_birth","age","gender","nationality","state_of_origin",
  "local_government","residential_address","religion","blood_group","genotype","phone_number","email",
  "passport_photo_url","home_address","residential_address_alt","city_town","state","guardian_name",
  "guardian_phone","guardian_email","guardian_occupation","last_school_attended","last_class_completed",
  "previous_school_address","last_exam_result_url","common_entrance_result_url","student_id_birth_cert_url",
  "medical_conditions","disabilities","emergency_contact_name","emergency_contact_phone",
  "school_testimonial_url","passport_photographs_url","guardian_id_type","guardian_id_file_url",
  "class_applying_for","specialized_track","schooling_option","amount_paid","payment_status","payment_reference",
]);

/** Form field names that differ from the database column names. */
const ADMISSION_FIELD_ALIASES: Record<string, string> = {
  dob: "date_of_birth",
  middle_name: "other_name",
  lga: "local_government",
  last_class_passed: "last_class_completed",
  address: "residential_address",
};

/** Read merged portal settings (defaults + saved overrides) from server code. */
async function readSettings() {
  const { getDb } = await import("./portal.server");
  const { DEFAULT_SETTINGS } = await import("./settings");
  const merged = structuredClone(DEFAULT_SETTINGS) as Record<string, Record<string, unknown>>;
  const { data } = await getDb().from("portal_settings").select("key, value");
  for (const row of data ?? []) {
    const key = String(row["key"]);
    if (merged[key]) Object.assign(merged[key], (row["value"] as object) ?? {});
  }
  return merged as unknown as typeof DEFAULT_SETTINGS;
}

/** Public: the live class catalogue used by the admissions form. */
export const listClassLevels = createServerFn({ method: "GET" }).handler(async () => {
  const settings = await readSettings();
  return {
    classLevels: settings.academic.classLevels,
    session: settings.academic.session,
    term: settings.academic.term,
  };
});

export const submitAdmission = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => d)
  .handler(async ({ data }) => {
    const { getDb, sendEmail, emailShell, adminEmail } = await import("./portal.server");
    const settings = await readSettings();
    const classLevel = String(data["class_applying_for"] ?? "").trim();
    if (!settings.academic.classLevels.includes(classLevel)) {
      return { ok: false as const, error: "Please choose a class from the school's class catalogue." };
    }
    const id = refId("JIA-ADM");
    const row: Record<string, unknown> = { id, payment_status: "Pending Verification" };
    for (const [rawKey, value] of Object.entries(data)) {
      const key = ADMISSION_FIELD_ALIASES[rawKey] ?? rawKey;
      if (ADMISSION_COLUMNS.has(key)) row[key] = value;
    }
    const { error } = await getDb().from("admissions").insert(row);
    if (error) return { ok: false as const, error: error.message };



    const name = `${data["first_name"] ?? ""} ${data["surname"] ?? ""}`.trim();
    await sendEmail({
      to: String(data["guardian_email"]),
      subject: `Admission application received — ${id}`,
      html: emailShell(
        "Application Received",
        `<p>Dear ${data["guardian_name"]},</p>
         <p>We have received the admission application for <strong>${name}</strong> into
         <strong>${data["class_applying_for"]}</strong>.</p>
         <p>Your application reference is <strong>${id}</strong>. Please keep it safe — you
         will need it to track your application and to activate the student portal.</p>`,
      ),
    });
    await sendEmail({
      to: adminEmail(),
      subject: `New admission application — ${name} (${id})`,
      html: emailShell(
        "New Admission Application",
        `<p><strong>${name}</strong> applied for <strong>${data["class_applying_for"]}</strong>.</p>
         <p>Guardian: ${data["guardian_name"]} — ${data["guardian_phone"]} — ${data["guardian_email"]}</p>
         <p>Reference: ${id}</p>`,
      ),
    });
    return { ok: true as const, id };
  });

export const submitCareer = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => d)
  .handler(async ({ data }) => {
    const { getDb, sendEmail, emailShell, adminEmail } = await import("./portal.server");
    const id = refId("JIA-CAR");
    const { error } = await getDb().from("career_applications").insert({ ...data, id });
    if (error) return { ok: false as const, error: error.message };
    await sendEmail({
      to: String(data["email"]),
      subject: `Application received — ${data["position_applied_for"]}`,
      html: emailShell(
        "Application Received",
        `<p>Dear ${data["first_name"]},</p><p>Thank you for applying for the role of
         <strong>${data["position_applied_for"]}</strong>. Your reference is <strong>${id}</strong>.</p>`,
      ),
    });
    await sendEmail({
      to: adminEmail(),
      subject: `New career application — ${data["position_applied_for"]}`,
      html: emailShell(
        "New Career Application",
        `<p>${data["first_name"]} ${data["surname"]} — ${data["email"]} — ${data["phone"]}</p>
         <p>Position: ${data["position_applied_for"]}</p>`,
      ),
    });
    return { ok: true as const, id };
  });

export const submitHolidayCoaching = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => d)
  .handler(async ({ data }) => {
    const { getDb, sendEmail, emailShell, adminEmail } = await import("./portal.server");
    const id = refId("JIA-HOL");
    const { error } = await getDb()
      .from("holiday_coaching_applications")
      .insert({ ...data, id });
    if (error) return { ok: false as const, error: error.message };
    await sendEmail({
      to: String(data["guardian_email"]),
      subject: `Holiday coaching registration — ${id}`,
      html: emailShell(
        "Holiday Coaching Registration",
        `<p>Dear ${data["guardian_name"]},</p><p>${data["first_name"]} ${data["surname"]} has been
         registered for holiday coaching. Reference: <strong>${id}</strong>.</p>`,
      ),
    });
    await sendEmail({
      to: adminEmail(),
      subject: `New holiday coaching registration — ${id}`,
      html: emailShell(
        "New Holiday Coaching Registration",
        `<p>${data["first_name"]} ${data["surname"]} — ${data["class_applying_for"]}</p>`,
      ),
    });
    return { ok: true as const, id };
  });

export const trackApplication = createServerFn({ method: "POST" })
  .inputValidator((d: { reference: string }) => d)
  .handler(async ({ data }) => {
    const { getDb } = await import("./portal.server");
    const { data: row } = await getDb()
      .from("admissions")
      .select(
        "id, first_name, surname, class_applying_for, payment_status, payment_reference, created_at",
      )

      .eq("id", data.reference.trim())
      .maybeSingle();
    return row ?? null;
  });

/* ------------------------------------------------------------------ */
/* Student portal                                                      */
/* ------------------------------------------------------------------ */

export const studentOverview = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb, requireStudent } = await import("./portal.server");
  const user = await requireStudent();
  const db = getDb();
  const [profile, assignments, scores, fees, notices, registration] = await Promise.all([
    db.from("student_profiles").select("*").eq("admission_id", user.id!).maybeSingle(),
    db.from("student_assignments").select("*").eq("admission_id", user.id!),
    db.from("exam_scores").select("*").eq("admission_id", user.id!),
    db.from("fee_payments").select("*").eq("admission_id", user.id!),
    db.from("notices").select("*").order("created_at", { ascending: false }).limit(5),
    db
      .from("student_subject_registrations")
      .select("*")
      .eq("admission_id", user.id!)
      .maybeSingle(),
  ]);
  return {
    profile: profile.data,
    assignments: assignments.data ?? [],
    scores: scores.data ?? [],
    fees: fees.data ?? [],
    notices: notices.data ?? [],
    registration: registration.data,
  };
});

export const studentAssignments = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb, requireStudent } = await import("./portal.server");
  const user = await requireStudent();
  const db = getDb();
  const { data: mine } = await db
    .from("student_assignments")
    .select("*")
    .eq("admission_id", user.id!);
  const { data: all } = await db
    .from("assignments")
    .select("*")
    .eq("class_level", user.classLevel ?? "")
    .order("due_date", { ascending: true });
  return { mine: mine ?? [], available: all ?? [] };
});

export const submitAssignment = createServerFn({ method: "POST" })
  .inputValidator((d: { assignmentId: string; text: string; fileUrl?: string }) => d)
  .handler(async ({ data }) => {
    const { getDb, requireStudent } = await import("./portal.server");
    const user = await requireStudent();
    const db = getDb();
    const { data: existing } = await db
      .from("student_assignments")
      .select("id")
      .eq("admission_id", user.id!)
      .eq("assignment_id", data.assignmentId)
      .maybeSingle();
    const payload = {
      admission_id: user.id!,
      assignment_id: data.assignmentId,
      status: "Submitted",
      feedback: data.text ? `Student note: ${data.text}` : null,
      submitted_at: new Date().toISOString(),
    };

    const { error } = existing
      ? await db.from("student_assignments").update(payload).eq("id", existing["id"])
      : await db.from("student_assignments").insert(payload);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const saveSubjectRegistration = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      selected_subjects: string[];
      trade_subject?: string;
      music_instrument?: string;
      ict_track?: string;
      extra_curricular?: string[];
    }) => d,
  )
  .handler(async ({ data }) => {
    const { getDb, requireStudent } = await import("./portal.server");
    const user = await requireStudent();
    const db = getDb();
    const { data: existing } = await db
      .from("student_subject_registrations")
      .select("id")
      .eq("admission_id", user.id!)
      .maybeSingle();
    const payload = {
      admission_id: user.id!,
      class_level: user.classLevel ?? "",
      selected_subjects: data.selected_subjects,
      trade_subject: data.trade_subject ?? null,
      music_instrument: data.music_instrument ?? null,
      ict_track: data.ict_track ?? null,
      extra_curricular: data.extra_curricular ?? [],
      updated_at: new Date().toISOString(),
    };
    const { error } = existing
      ? await db.from("student_subject_registrations").update(payload).eq("id", existing["id"])
      : await db.from("student_subject_registrations").insert(payload);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const studentResults = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb, requireStudent } = await import("./portal.server");
  const user = await requireStudent();
  const db = getDb();
  const [scores, reports, profile, attendance, admission] = await Promise.all([
    db.from("exam_scores").select("*").eq("admission_id", user.id!).order("subject"),
    db.from("student_term_reports").select("*").eq("admission_id", user.id!),
    db.from("student_profiles").select("*").eq("admission_id", user.id!).maybeSingle(),
    db.from("attendance_records").select("*").eq("admission_id", user.id!),
    db
      .from("admissions")
      .select("gender, age, date_of_birth")
      .eq("id", user.id!)
      .maybeSingle(),
  ]);
  return {
    scores: scores.data ?? [],
    reports: reports.data ?? [],
    profile: profile.data ? { ...profile.data, ...(admission.data ?? {}) } : admission.data,
    attendance: attendance.data ?? [],
  };
});


/* ------------------------------------------------------------------ */
/* Staff portal                                                        */
/* ------------------------------------------------------------------ */

export const staffOverview = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb, requireStaff, requirePermission } = await import("./portal.server");
  const user = await requireStaff();
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const [students, admissions, assignments, attendance, fees, careers] = await Promise.all([
    db.from("student_profiles").select("admission_id", { count: "exact", head: true }),
    db.from("admissions").select("*").order("created_at", { ascending: false }).limit(8),
    db.from("assignments").select("*").order("created_at", { ascending: false }).limit(5),
    db.from("staff_attendance").select("*").eq("staff_id", user.id!).eq("date", today).maybeSingle(),
    db.from("fee_payments").select("amount, status"),
    db.from("career_applications").select("id", { count: "exact", head: true }),
  ]);
  const paid = (fees.data ?? [])
    .filter((f) => f["status"] === "Paid" || f["status"] === "Success")
    .reduce((sum, f) => sum + Number(f["amount"] ?? 0), 0);
  return {
    me: user,
    studentCount: students.count ?? 0,
    careerCount: careers.count ?? 0,
    recentAdmissions: admissions.data ?? [],
    recentAssignments: assignments.data ?? [],
    todayAttendance: attendance.data,
    feesCollected: paid,
  };
});

export const clockAttendance = createServerFn({ method: "POST" })
  .inputValidator((d: { action: "in" | "out"; remarks?: string }) => d)
  .handler(async ({ data }) => {
    const { getDb, requireStaff, requirePermission } = await import("./portal.server");
    const user = await requireStaff();
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toLocaleTimeString("en-GB", { hour12: false, timeZone: "Africa/Lagos" });
    const { data: existing } = await db
      .from("staff_attendance")
      .select("*")
      .eq("staff_id", user.id!)
      .eq("date", today)
      .maybeSingle();

    if (data.action === "in") {
      if (existing) return { ok: false as const, error: "You already clocked in today." };
      const hour = Number(now.slice(0, 2));
      const { error } = await db.from("staff_attendance").insert({
        staff_id: user.id!,
        staff_name: user.name ?? "",
        email: user.email ?? null,
        date: today,
        clock_in_time: now,
        status: hour >= 8 ? "Late" : "Present",
        arrival_status: hour >= 8 ? "Late (15-30m)" : "On Time",
        remarks: data.remarks ?? null,
      });
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const };
    }

    if (!existing) return { ok: false as const, error: "Clock in first." };
    const start = String(existing["clock_in_time"] ?? "08:00:00");
    const toH = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return (h ?? 0) + (m ?? 0) / 60;
    };
    const { error } = await db
      .from("staff_attendance")
      .update({
        clock_out_time: now,
        work_duration_hours: Math.max(0, +(toH(now) - toH(start)).toFixed(2)),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing["id"]);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const attendanceHistory = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb, requireStaff, requirePermission } = await import("./portal.server");
  const user = await requireStaff();
  const { data } = await getDb()
    .from("staff_attendance")
    .select("*")
    .eq("staff_id", user.id!)
    .order("date", { ascending: false })
    .limit(30);
  return data ?? [];
});

export const listStudents = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb, requireStaff, requirePermission } = await import("./portal.server");
  await requirePermission("students.view");
  const { data } = await getDb()
    .from("student_profiles")
    .select("*")
    .order("class_level", { ascending: true });
  return data ?? [];
});

export const ADMISSION_STATUSES = [
  "Pending Verification",
  "Paid",
  "Under Review",
  "Approved",
  "Rejected",
  "Enrolled",
] as const;

export const listAdmissions = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb, requirePermission } = await import("./portal.server");
  await requirePermission("admissions.review");
  const db = getDb();
  const [{ data }, { data: profiles }] = await Promise.all([
    db.from("admissions").select("*").order("created_at", { ascending: false }),
    db.from("student_profiles").select("admission_id, student_email, class_level"),
  ]);
  const byId = new Map((profiles ?? []).map((p) => [String(p["admission_id"]), p]));
  const settings = await readSettings();
  return {
    classLevels: settings.academic.classLevels,
    session: settings.academic.session,
    rows: (data ?? []).map((a) => {
      const profile = byId.get(String(a["id"]));
      return {
        ...a,
        enrolled: Boolean(profile),
        student_email: profile ? String(profile["student_email"] ?? "") : "",
        enrolled_class: profile ? String(profile["class_level"] ?? "") : "",
      };
    }),
  };
});

export const updateAdmission = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; application_status: string; class_applying_for?: string; notify?: boolean }) => d)
  .handler(async ({ data }) => {
    const { getDb, requirePermission, sendEmail, emailShell } = await import("./portal.server");
    await requirePermission("admissions.review");
    const db = getDb();
    const patch: Record<string, unknown> = {
      payment_status: data.application_status,
      updated_at: new Date().toISOString(),
    };
    if (data.class_applying_for) patch["class_applying_for"] = data.class_applying_for;
    const { data: row, error } = await db
      .from("admissions")
      .update(patch)
      .eq("id", data.id)
      .select()
      .maybeSingle();
    if (error) return { ok: false as const, error: error.message };

    if (data.notify && row) {
      const approved = data.application_status === "Approved";
      await sendEmail({
        to: String(row["guardian_email"]),
        subject: approved
          ? `Admission approved — ${row["id"]}`
          : `Admission update — ${row["id"]}`,
        html: emailShell(
          approved ? "Admission Approved" : "Admission Status Update",
          `<p>Dear ${row["guardian_name"]},</p>
           <p>The application for <strong>${row["first_name"]} ${row["surname"]}</strong> is now
           <strong>${data.application_status}</strong>${
             approved ? ` for placement in <strong>${row["class_applying_for"]}</strong>` : ""
           }.</p>
           ${
             approved
               ? `<p>The student portal account and login details will be sent in a separate enrolment confirmation email.</p>`
               : ""
           }`,
        ),
      });
    }
    return { ok: true as const };
  });

export const enrollStudent = createServerFn({ method: "POST" })
  .inputValidator((d: { admissionId: string; classLevel?: string }) => d)
  .handler(async ({ data }) => {
    const { getDb, requirePermission, sendEmail, emailShell, adminEmail, hashPassword } =
      await import("./portal.server");
    await requirePermission("admissions.enrol");
    const db = getDb();
    const settings = await readSettings();
    const { data: adm } = await db
      .from("admissions")
      .select("*")
      .eq("id", data.admissionId)
      .maybeSingle();
    if (!adm) return { ok: false as const, error: "Admission not found." };

    const status = String(adm["payment_status"] ?? "");
    if (status !== "Approved" && status !== "Enrolled") {
      return {
        ok: false as const,
        error: "Approve the application before generating a student account.",
      };
    }

    const classLevel = String(data.classLevel ?? adm["class_applying_for"] ?? "").trim();
    if (!settings.academic.classLevels.includes(classLevel)) {
      return { ok: false as const, error: "Set a class from the class catalogue before enrolling." };
    }

    const { data: existing } = await db
      .from("student_profiles")
      .select("admission_id, student_email")
      .eq("admission_id", adm["id"])
      .maybeSingle();

    /* Unique student email within the school domain. */
    const slug = (v: unknown) =>
      String(v ?? "")
        .toLowerCase()
        .replace(/[^a-z]/g, "");
    const base = `${slug(adm["first_name"])}.${slug(adm["surname"])}`;
    let email = existing ? String(existing["student_email"]) : `${base}@student.jobamultiltd.com`;
    if (!existing) {
      const { data: clash } = await db
        .from("student_profiles")
        .select("admission_id")
        .eq("student_email", email)
        .maybeSingle();
      if (clash) email = `${base}.${String(adm["id"]).slice(-4).toLowerCase()}@student.jobamultiltd.com`;
    }

    const password = `JIA${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { error } = await db.from("student_profiles").upsert(
      {
        admission_id: adm["id"],
        student_email: email,
        guardian_email: adm["guardian_email"],
        first_name: adm["first_name"],
        last_name: adm["surname"],
        class_level: classLevel,
        specialized_track: adm["specialized_track"],
        schooling_option: adm["schooling_option"],
        portal_password_hash: await hashPassword(password),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "admission_id" },
    );
    if (error) return { ok: false as const, error: error.message };

    await db
      .from("admissions")
      .update({
        payment_status: "Enrolled",
        class_applying_for: classLevel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", adm["id"]);

    const studentName = `${adm["first_name"]} ${adm["surname"]}`;
    await sendEmail({
      to: [String(adm["guardian_email"])],
      subject: `Enrolment confirmed — ${studentName} (${adm["id"]})`,
      html: emailShell(
        "Enrolment Confirmation",
        `<p>Dear ${adm["guardian_name"]},</p>
         <p>We are pleased to confirm that <strong>${studentName}</strong> has been enrolled at
         ${settings.school.name} for the <strong>${settings.academic.session}</strong> academic session.</p>
         <p>Class: <strong>${classLevel}</strong><br/>
         Schooling option: <strong>${adm["schooling_option"] ?? "Day Schooling"}</strong><br/>
         Admission ID: <strong>${adm["id"]}</strong></p>
         <p>The student portal account is ready:</p>
         <p>Student email: <strong>${email}</strong><br/>
         Temporary password: <strong>${password}</strong></p>
         <p>Please sign in and change the password on first login. Resumption${
           settings.academic.resumptionDate ? ` is on ${settings.academic.resumptionDate}` : " details follow shortly"
         }.</p>`,
      ),
    });
    await sendEmail({
      to: adminEmail(),
      subject: `Student enrolled — ${studentName} (${classLevel})`,
      html: emailShell(
        "New Enrolment",
        `<p><strong>${studentName}</strong> (${adm["id"]}) was enrolled into <strong>${classLevel}</strong>
         for ${settings.academic.session}. Portal login: ${email}</p>`,
      ),
    });
    return { ok: true as const, email, password, classLevel };
  });


export const saveExamScore = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      admission_id: string;
      subject: string;
      term: string;
      session: string;
      ca1: number;
      ca2: number;
      exam: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { getDb, requireStaff, requirePermission } = await import("./portal.server");
    await requirePermission("scores.enter");
    const db = getDb();
    const total = Number(data.ca1) + Number(data.ca2) + Number(data.exam);
    const grade =
      total >= 75 ? "A" : total >= 65 ? "B" : total >= 55 ? "C" : total >= 45 ? "D" : total >= 40 ? "E" : "F";
    const { data: existing } = await db
      .from("exam_scores")
      .select("id")
      .eq("admission_id", data.admission_id)
      .eq("subject", data.subject)
      .eq("term", data.term)
      .eq("session", data.session)
      .maybeSingle();
    const { admission_id, subject, term, session } = data;
    const payload = {
      admission_id,
      subject,
      term,
      session,
      exam_type: "Terminal Exam",
      ca1_score: Number(data.ca1),
      ca2_score: Number(data.ca2),
      exam_score: Number(data.exam),
      total_score: total,
      score: total,
      grade,
      updated_at: new Date().toISOString(),
    };
    const { error } = existing
      ? await db.from("exam_scores").update(payload).eq("id", existing["id"])

      : await db.from("exam_scores").insert(payload);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, total, grade };
  });

export const createAssignment = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      title: string;
      subject: string;
      class_level: string;
      due_date: string;
      total_score: number;
      instructions: string;
    }) => d,
  )
  .handler(async ({ data, context: _c }) => {
    const { getDb, requireStaff, requirePermission } = await import("./portal.server");
    const user = await requirePermission("assignments.manage");
    const { error } = await getDb()
      .from("assignments")
      .insert({ ...data, teacher_name: user.name ?? "" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const createNotice = createServerFn({ method: "POST" })
  .inputValidator((d: { title: string; content: string; type: string }) => d)
  .handler(async ({ data }) => {
    const { getDb, requireStaff, requirePermission } = await import("./portal.server");
    const user = await requirePermission("notices.publish");
    const { error } = await getDb()
      .from("notices")
      .insert({
        ...data,
        author: user.name ?? "Principal's Office",
        date_posted: new Date().toISOString().slice(0, 10),
      });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const listFees = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb, requireStaff, requirePermission } = await import("./portal.server");
  await requirePermission("fees.manage");
  const { data } = await getDb()
    .from("fee_payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
});

export const recordFee = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      admission_id: string;
      payment_type: string;
      description: string;
      amount: number;
      status: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { getDb, requireStaff, requirePermission, sendEmail, emailShell } = await import("./portal.server");
    await requirePermission("fees.manage");
    const reference = `PAY-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await getDb().from("fee_payments").insert({ ...data, reference });
    if (error) return { ok: false as const, error: error.message };

    if (data.status === "Paid" || data.status === "Part Payment") {
      const target = await findGuardian(data.admission_id);
      if (target) {
        await sendEmail({
          to: target.email,
          subject: `Payment receipt ${reference} — ${target.studentName}`,
          html: emailShell(
            "Fee Payment Received",
            `<p>Dear ${target.guardianName},</p>
             <p>We have received <strong>₦${Number(data.amount).toLocaleString()}</strong>
             (${data.payment_type}) for <strong>${target.studentName}</strong> (${target.classLevel}).</p>
             <p>Reference: <strong>${reference}</strong><br/>Status: <strong>${data.status}</strong><br/>
             Description: ${data.description}</p>`,
          ),
        });
      }
    }
    return { ok: true as const, reference };
  });

/* ------------------------------------------------------------------ */
/* Admin: portal settings & staff management                           */
/* ------------------------------------------------------------------ */

export const getPortalSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb } = await import("./portal.server");
  const { DEFAULT_SETTINGS } = await import("./settings");
  const { data, error } = await getDb().from("portal_settings").select("key, value");
  if (error) {
    return { settings: DEFAULT_SETTINGS, ready: false, error: error.message };
  }
  const merged = structuredClone(DEFAULT_SETTINGS) as Record<string, Record<string, unknown>>;
  for (const row of data ?? []) {
    const key = String(row["key"]);
    if (merged[key]) Object.assign(merged[key], (row["value"] as object) ?? {});
  }
  return { settings: merged as unknown as typeof DEFAULT_SETTINGS, ready: true, error: null };
});

export const savePortalSettings = createServerFn({ method: "POST" })
  .inputValidator((d: { key: "school" | "academic" | "portal"; value: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const { getDb, requireAdmin } = await import("./portal.server");
    try {
      await requireAdmin();
    } catch {
      return { ok: false as const, error: "Administrator access required." };
    }
    const { error } = await getDb()
      .from("portal_settings")
      .upsert(
        { key: data.key, value: data.value, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const listStaff = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb, requireAdmin } = await import("./portal.server");
  try {
    await requireAdmin();
  } catch {
    return [];
  }
  const { data } = await getDb()
    .from("staff_users")
    .select("id, staff_id, full_name, email, phone, role, department, assigned_classes, status, created_at")
    .order("full_name");
  return data ?? [];
});

export const saveStaffMember = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      id?: string;
      staffId: string;
      fullName: string;
      email: string;
      phone: string;
      role: string;
      department: string;
      assignedClasses: string[];
      status: string;
      password?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { getDb, requireAdmin } = await import("./portal.server");
    let admin;
    try {
      admin = await requireAdmin();
    } catch {
      return { ok: false as const, error: "Administrator access required." };
    }
    const db = getDb();
    const row: Record<string, unknown> = {
      staff_id: data.staffId.trim(),
      full_name: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      role: data.role,
      department: data.department.trim(),
      assigned_classes: data.assignedClasses,
      status: data.status,
      updated_at: new Date().toISOString(),
    };
    if (data.password && data.password.trim().length >= 6) {
      const { hashPassword } = await import("./portal.server");
      row["password_hash"] = await hashPassword(data.password.trim());
    }

    if (data.id) {
      if (data.id === admin.id && data.role !== "admin") {
        return { ok: false as const, error: "You cannot remove your own administrator role." };
      }
      const { error } = await db.from("staff_users").update(row).eq("id", data.id);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const };
    }

    if (!data.password || data.password.trim().length < 6) {
      return { ok: false as const, error: "A password of at least 6 characters is required." };
    }
    row["id"] = `usr-${Date.now().toString(36)}`;
    row["created_at"] = new Date().toISOString();
    const { error } = await db.from("staff_users").insert(row);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const setStaffStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: string }) => d)
  .handler(async ({ data }) => {
    const { getDb, requireAdmin } = await import("./portal.server");
    let admin;
    try {
      admin = await requireAdmin();
    } catch {
      return { ok: false as const, error: "Administrator access required." };
    }
    if (data.id === admin.id) {
      return { ok: false as const, error: "You cannot deactivate your own account." };
    }
    const { error } = await getDb()
      .from("staff_users")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* Parent notifications (email via Resend)                             */
/* ------------------------------------------------------------------ */

type GuardianTarget = {
  email: string;
  guardianName: string;
  studentName: string;
  classLevel: string;
};

async function findGuardian(admissionId: string): Promise<GuardianTarget | null> {
  const { getDb } = await import("./portal.server");
  const db = getDb();
  const { data: profile } = await db
    .from("student_profiles")
    .select("guardian_email, first_name, last_name, class_level")
    .eq("admission_id", admissionId)
    .maybeSingle();
  const { data: adm } = await db
    .from("admissions")
    .select("guardian_email, guardian_name, first_name, surname, class_applying_for")
    .eq("id", admissionId)
    .maybeSingle();

  const email = String(profile?.["guardian_email"] ?? adm?.["guardian_email"] ?? "").trim();
  if (!email) return null;
  return {
    email,
    guardianName: String(adm?.["guardian_name"] ?? "Parent/Guardian"),
    studentName:
      `${String(profile?.["first_name"] ?? adm?.["first_name"] ?? "")} ${String(
        profile?.["last_name"] ?? adm?.["surname"] ?? "",
      )}`.trim() || "your child",
    classLevel: String(profile?.["class_level"] ?? adm?.["class_applying_for"] ?? "—"),
  };
}

export const listGuardianContacts = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb, requireStaff, requirePermission } = await import("./portal.server");
  await requirePermission("parents.notify");
  const { data } = await getDb()
    .from("student_profiles")
    .select("admission_id, first_name, last_name, class_level, guardian_email")
    .order("class_level", { ascending: true });
  return data ?? [];
});

/** Attendance alert to a parent (present / late / absent). */
export const notifyAttendance = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { admission_id: string; status: "Present" | "Late" | "Absent"; date: string; note?: string }) => d,
  )
  .handler(async ({ data }) => {
    const { requireStaff, requirePermission, sendEmail, emailShell } = await import("./portal.server");
    await requirePermission("parents.notify");
    const target = await findGuardian(data.admission_id);
    if (!target) return { ok: false as const, error: "No guardian email on record for this student." };

    const tone =
      data.status === "Absent"
        ? "was <strong>absent</strong> from school"
        : data.status === "Late"
          ? "arrived <strong>late</strong> to school"
          : "was <strong>present</strong> in school";

    const res = await sendEmail({
      to: target.email,
      subject: `Attendance alert — ${target.studentName} (${data.date})`,
      html: emailShell(
        "Daily Attendance Alert",
        `<p>Dear ${target.guardianName},</p>
         <p>This is to inform you that <strong>${target.studentName}</strong> (${target.classLevel}) ${tone}
         on <strong>${data.date}</strong>.</p>
         ${data.note ? `<p>Class teacher's note: ${data.note}</p>` : ""}
         <p>Please contact the school office if you have any questions.</p>`,
      ),
    });
    if (!res.sent) return { ok: false as const, error: "Email gateway rejected the message." };
    return { ok: true as const, email: target.email };
  });

/** Outstanding fee reminder to a parent. */
export const sendFeeReminder = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { admission_id: string; amount: number; due_date?: string; note?: string }) => d,
  )
  .handler(async ({ data }) => {
    const { requireStaff, requirePermission, sendEmail, emailShell } = await import("./portal.server");
    await requirePermission("parents.notify");
    const target = await findGuardian(data.admission_id);
    if (!target) return { ok: false as const, error: "No guardian email on record for this student." };

    const res = await sendEmail({
      to: target.email,
      subject: `School fee reminder — ${target.studentName}`,
      html: emailShell(
        "Outstanding School Fees",
        `<p>Dear ${target.guardianName},</p>
         <p>Our bursary records show an outstanding balance of
         <strong>₦${Number(data.amount).toLocaleString()}</strong> on the account of
         <strong>${target.studentName}</strong> (${target.classLevel}).</p>
         ${data.due_date ? `<p>Kindly settle on or before <strong>${data.due_date}</strong>.</p>` : ""}
         ${data.note ? `<p>${data.note}</p>` : ""}
         <p>Please disregard this notice if payment has already been made.</p>`,
      ),
    });
    if (!res.sent) return { ok: false as const, error: "Email gateway rejected the message." };
    return { ok: true as const, email: target.email };
  });
