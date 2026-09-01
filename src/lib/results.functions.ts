import { createServerFn } from "@tanstack/react-start";

import { resultsKey, type PortalSettings } from "./settings";

async function loadSettings(): Promise<PortalSettings> {
  const { getDb } = await import("./portal.server");
  const { DEFAULT_SETTINGS } = await import("./settings");
  const merged = structuredClone(DEFAULT_SETTINGS) as unknown as Record<string, Record<string, unknown>>;
  const { data } = await getDb().from("portal_settings").select("key, value");
  for (const row of data ?? []) {
    const key = String(row["key"]);
    if (merged[key]) Object.assign(merged[key], (row["value"] as object) ?? {});
  }
  return merged as unknown as PortalSettings;
}

/** True when the given class/session/term results are visible to students & parents. */
export async function isClassPublished(
  classLevel: string,
  session: string,
  term: string,
  settings?: PortalSettings,
) {
  const s = settings ?? (await loadSettings());
  const flag = s.results?.published?.[resultsKey(classLevel, session, term)];
  return flag ?? s.portal.resultsPublished;
}

function gradeFor(total: number) {
  return total >= 75 ? "A" : total >= 65 ? "B" : total >= 55 ? "C" : total >= 45 ? "D" : total >= 40 ? "E" : "F";
}

/** Class + session/term options for the results console. */
export const resultsContext = createServerFn({ method: "GET" }).handler(async () => {
  const { requirePermission } = await import("./portal.server");
  await requirePermission("scores.enter");
  const settings = await loadSettings();
  return {
    classLevels: settings.academic.classLevels,
    session: settings.academic.session,
    term: settings.academic.term,
    published: settings.results?.published ?? {},
    globalPublished: settings.portal.resultsPublished,
  };
});

export const classResults = createServerFn({ method: "GET" })
  .inputValidator((d: { classLevel: string; session: string; term: string }) => d)
  .handler(async ({ data }) => {
    const { getDb, requirePermission } = await import("./portal.server");
    await requirePermission("scores.enter");
    const db = getDb();
    const settings = await loadSettings();

    const { data: students } = await db
      .from("student_profiles")
      .select("admission_id, first_name, last_name, class_level")
      .eq("class_level", data.classLevel)
      .order("last_name");

    const ids = (students ?? []).map((s) => String(s["admission_id"]));
    const [{ data: scores }, { data: registrations }] = await Promise.all([
      ids.length
        ? db
            .from("exam_scores")
            .select("*")
            .in("admission_id", ids)
            .eq("term", data.term)
            .eq("session", data.session)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      ids.length
        ? db.from("student_subject_registrations").select("admission_id, selected_subjects").in("admission_id", ids)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ]);

    const subjects = new Set<string>();
    for (const r of registrations ?? []) {
      for (const s of (r["selected_subjects"] as string[] | null) ?? []) subjects.add(String(s));
    }
    for (const s of scores ?? []) subjects.add(String(s["subject"] ?? ""));
    subjects.delete("");

    return {
      published: await isClassPublished(data.classLevel, data.session, data.term, settings),
      subjects: [...subjects].sort(),
      students: (students ?? []).map((s) => ({
        admissionId: String(s["admission_id"]),
        name: `${String(s["first_name"] ?? "")} ${String(s["last_name"] ?? "")}`.trim(),
      })),
      scores: (scores ?? []).map((s) => ({
        admissionId: String(s["admission_id"]),
        subject: String(s["subject"] ?? ""),
        ca1: Number(s["ca1_score"] ?? 0),
        ca2: Number(s["ca2_score"] ?? 0),
        exam: Number(s["exam_score"] ?? 0),
        total: Number(s["total_score"] ?? 0),
        grade: String(s["grade"] ?? ""),
      })),
    };
  });

export const saveClassResults = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      classLevel: string;
      session: string;
      term: string;
      subject: string;
      rows: { admissionId: string; ca1: number; ca2: number; exam: number }[];
    }) => d,
  )
  .handler(async ({ data }) => {
    const { getDb, requirePermission } = await import("./portal.server");
    await requirePermission("scores.enter");
    const db = getDb();
    const subject = data.subject.trim();
    if (!subject) return { ok: false as const, error: "Choose a subject first." };

    const ids = data.rows.map((r) => r.admissionId);
    const { data: existing } = await db
      .from("exam_scores")
      .select("id, admission_id")
      .in("admission_id", ids.length ? ids : ["__none__"])
      .eq("subject", subject)
      .eq("term", data.term)
      .eq("session", data.session);
    const byStudent = new Map((existing ?? []).map((r) => [String(r["admission_id"]), r["id"]]));

    let saved = 0;
    for (const row of data.rows) {
      const ca1 = clamp(row.ca1, 20);
      const ca2 = clamp(row.ca2, 20);
      const exam = clamp(row.exam, 60);
      const total = ca1 + ca2 + exam;
      const payload = {
        admission_id: row.admissionId,
        subject,
        term: data.term,
        session: data.session,
        exam_type: "Terminal Exam",
        ca1_score: ca1,
        ca2_score: ca2,
        exam_score: exam,
        total_score: total,
        score: total,
        grade: gradeFor(total),
        updated_at: new Date().toISOString(),
      };
      const id = byStudent.get(row.admissionId);
      const { error } = id
        ? await db.from("exam_scores").update(payload).eq("id", id)
        : await db.from("exam_scores").insert(payload);
      if (error) return { ok: false as const, error: error.message };
      saved += 1;
    }
    return { ok: true as const, saved };
  });

function clamp(value: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.round(n), max);
}

export const publishClassResults = createServerFn({ method: "POST" })
  .inputValidator((d: { classLevel: string; session: string; term: string; published: boolean }) => d)
  .handler(async ({ data }) => {
    const { getDb, requirePermission } = await import("./portal.server");
    await requirePermission("results.publish");
    const settings = await loadSettings();
    const published = { ...(settings.results?.published ?? {}) };
    published[resultsKey(data.classLevel, data.session, data.term)] = data.published;
    const { error } = await getDb()
      .from("portal_settings")
      .upsert({ key: "results", value: { published }, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) {
      return {
        ok: false as const,
        error:
          "Could not save the publication state — run the portal settings SQL in Supabase first (Staff → Administration).",
      };
    }
    return { ok: true as const, published: data.published };
  });
