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

export const submitAdmission = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => d)
  .handler(async ({ data }) => {
    const { getDb, sendEmail, emailShell, adminEmail } = await import("./portal.server");
    const id = refId("JIA-ADM");
    const row = { ...data, id };
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
  const [scores, reports, profile, attendance] = await Promise.all([
    db.from("exam_scores").select("*").eq("admission_id", user.id!).order("subject"),
    db.from("student_term_reports").select("*").eq("admission_id", user.id!),
    db.from("student_profiles").select("*").eq("admission_id", user.id!).maybeSingle(),
    db.from("attendance_records").select("*").eq("admission_id", user.id!),
  ]);
  return {
    scores: scores.data ?? [],
    reports: reports.data ?? [],
    profile: profile.data,
    attendance: attendance.data ?? [],
  };
});

/* ------------------------------------------------------------------ */
/* Staff portal                                                        */
/* ------------------------------------------------------------------ */

export const staffOverview = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb, requireStaff } = await import("./portal.server");
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
    const { getDb, requireStaff } = await import("./portal.server");
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
  const { getDb, requireStaff } = await import("./portal.server");
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
  const { getDb, requireStaff } = await import("./portal.server");
  await requireStaff();
  const { data } = await getDb()
    .from("student_profiles")
    .select("*")
    .order("class_level", { ascending: true });
  return data ?? [];
});

export const listAdmissions = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb, requireStaff } = await import("./portal.server");
  await requireStaff();
  const { data } = await getDb()
    .from("admissions")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
});

export const updateAdmission = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; application_status: string; notify?: boolean }) => d)
  .handler(async ({ data }) => {
    const { getDb, requireStaff, sendEmail, emailShell } = await import("./portal.server");
    await requireStaff();
    const db = getDb();
    const { data: row, error } = await db
      .from("admissions")
      .update({
        application_status: data.application_status,
        status: data.application_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select()
      .maybeSingle();
    if (error) return { ok: false as const, error: error.message };

    if (data.notify && row) {
      await sendEmail({
        to: String(row["guardian_email"]),
        subject: `Admission update — ${row["id"]}`,
        html: emailShell(
          "Admission Status Update",
          `<p>Dear ${row["guardian_name"]},</p>
           <p>The application for <strong>${row["first_name"]} ${row["surname"]}</strong> is now
           <strong>${data.application_status}</strong>.</p>`,
        ),
      });
    }
    return { ok: true as const };
  });

export const enrollStudent = createServerFn({ method: "POST" })
  .inputValidator((d: { admissionId: string }) => d)
  .handler(async ({ data }) => {
    const { getDb, requireStaff, sendEmail, emailShell } = await import("./portal.server");
    await requireStaff();
    const db = getDb();
    const { data: adm } = await db
      .from("admissions")
      .select("*")
      .eq("id", data.admissionId)
      .maybeSingle();
    if (!adm) return { ok: false as const, error: "Admission not found." };

    const password = `JIA${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const email = `${String(adm["first_name"]).toLowerCase()}.${String(adm["surname"]).toLowerCase()}@student.jobamultiltd.com`;
    const { error } = await db.from("student_profiles").upsert(
      {
        admission_id: adm["id"],
        student_email: email,
        guardian_email: adm["guardian_email"],
        guardian_phone: adm["guardian_phone"],
        first_name: adm["first_name"],
        last_name: adm["surname"],
        class_level: adm["class_applying_for"],
        specialized_track: adm["specialized_track"],
        schooling_option: adm["schooling_option"],
        portal_password_hash: password,
        is_activated: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "admission_id" },
    );
    if (error) return { ok: false as const, error: error.message };

    await sendEmail({
      to: [String(adm["guardian_email"])],
      subject: "Student portal credentials",
      html: emailShell(
        "Portal Access Created",
        `<p>Dear ${adm["guardian_name"]},</p>
         <p>The student portal account for <strong>${adm["first_name"]} ${adm["surname"]}</strong> is ready.</p>
         <p>Admission ID: <strong>${adm["id"]}</strong><br/>
         Student email: <strong>${email}</strong><br/>
         Temporary password: <strong>${password}</strong></p>`,
      ),
    });
    return { ok: true as const, email, password };
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
    const { getDb, requireStaff } = await import("./portal.server");
    await requireStaff();
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
    const { getDb, requireStaff } = await import("./portal.server");
    const user = await requireStaff();
    const { error } = await getDb()
      .from("assignments")
      .insert({ ...data, teacher_name: user.name ?? "" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const createNotice = createServerFn({ method: "POST" })
  .inputValidator((d: { title: string; content: string; type: string }) => d)
  .handler(async ({ data }) => {
    const { getDb, requireStaff } = await import("./portal.server");
    const user = await requireStaff();
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
  const { getDb, requireStaff } = await import("./portal.server");
  await requireStaff();
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
    const { getDb, requireStaff } = await import("./portal.server");
    await requireStaff();
    const { error } = await getDb()
      .from("fee_payments")
      .insert({ ...data, reference: `PAY-${Date.now().toString(36).toUpperCase()}` });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
