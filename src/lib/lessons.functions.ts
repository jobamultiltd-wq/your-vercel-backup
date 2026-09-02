import { createServerFn } from "@tanstack/react-start";

import { TIMETABLE_DAYS, type TimetableDay } from "./timetable";

function lagosNow() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "long" }).format(now);
  return { date, time, day };
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":");
  return Number(h ?? 0) * 60 + Number(m ?? 0);
}

/** Today's timetable lessons for the signed-in teacher, with their clocking state. */
export const myLessonsToday = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb, requirePermission } = await import("./portal.server");
  const { normaliseTimetable, teacherSchedules } = await import("./timetable");
  const user = await requirePermission("attendance.clock");
  const db = getDb();
  const { date, time, day } = lagosNow();

  const { data: row, error: settingsError } = await db
    .from("portal_settings")
    .select("value")
    .eq("key", "timetable")
    .maybeSingle();

  const raw = ((row?.["value"] as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  const data: Record<string, ReturnType<typeof normaliseTimetable>> = {};
  for (const [cls, table] of Object.entries(raw)) data[cls] = normaliseTimetable(table);

  const teacher = String(user.name ?? "").trim();
  const schedules = teacherSchedules(data);
  const key = Object.keys(schedules).find((t) => t.toLowerCase() === teacher.toLowerCase());
  const entries = (key ? schedules[key] ?? [] : []).filter((e) => e.day === day);

  const { data: logs, error: logsError } = await db
    .from("lesson_attendance")
    .select("*")
    .eq("staff_id", user.id!)
    .eq("date", date);

  const byLesson = new Map(
    (logs ?? []).map((l) => [`${String(l["class_level"])}|${Number(l["period_index"])}`, l]),
  );

  return {
    ready: !settingsError && !logsError,
    timetableReady: !settingsError,
    logReady: !logsError,
    teacher,
    day,
    date,
    time,
    isSchoolDay: (TIMETABLE_DAYS as readonly string[]).includes(day as TimetableDay),
    lessons: entries.map((e) => {
      const log = byLesson.get(`${e.classLevel}|${e.periodIndex}`);
      const start = toMinutes(e.period.start);
      const end = toMinutes(e.period.end);
      const nowMin = toMinutes(time);
      return {
        classLevel: e.classLevel,
        periodIndex: e.periodIndex,
        periodLabel: e.period.label,
        start: e.period.start,
        end: e.period.end,
        subject: e.subject,
        current: nowMin >= start && nowMin < end,
        past: nowMin >= end,
        clockIn: log ? String(log["clock_in_time"] ?? "") : "",
        clockOut: log ? String(log["clock_out_time"] ?? "") : "",
        status: log ? String(log["status"] ?? "") : "",
        remarks: log ? String(log["remarks"] ?? "") : "",
      };
    }),
  };
});

export const clockLesson = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { classLevel: string; periodIndex: number; action: "in" | "out"; remarks?: string }) => d,
  )
  .handler(async ({ data }) => {
    const { getDb, requirePermission } = await import("./portal.server");
    const { normaliseTimetable } = await import("./timetable");
    const user = await requirePermission("attendance.clock");
    const db = getDb();
    const { date, time, day } = lagosNow();

    const { data: row } = await db
      .from("portal_settings")
      .select("value")
      .eq("key", "timetable")
      .maybeSingle();
    const raw = ((row?.["value"] as Record<string, unknown>) ?? {}) as Record<string, unknown>;
    const table = normaliseTimetable(raw[data.classLevel]);
    const period = table.periods[data.periodIndex];
    const slot = table.slots[`${day}|${data.periodIndex}`];
    if (!period || !slot) {
      return { ok: false as const, error: "That period is not on today's timetable for this class." };
    }
    if ((slot.teacher ?? "").trim().toLowerCase() !== String(user.name ?? "").trim().toLowerCase()) {
      return { ok: false as const, error: "This lesson is assigned to another teacher." };
    }

    const { data: existing } = await db
      .from("lesson_attendance")
      .select("*")
      .eq("staff_id", user.id!)
      .eq("date", date)
      .eq("class_level", data.classLevel)
      .eq("period_index", data.periodIndex)
      .maybeSingle();

    if (data.action === "in") {
      if (existing) return { ok: false as const, error: "You already clocked in for this lesson." };
      const late = toMinutes(time) > toMinutes(period.start) + 5;
      const { error } = await db.from("lesson_attendance").insert({
        staff_id: user.id!,
        staff_name: user.name ?? "",
        class_level: data.classLevel,
        subject: slot.subject ?? "",
        date,
        day,
        period_index: data.periodIndex,
        period_label: period.label,
        scheduled_start: period.start,
        scheduled_end: period.end,
        clock_in_time: time,
        status: late ? "Late" : "On Time",
        remarks: data.remarks ?? "",
      });
      if (error) return { ok: false as const, error: tableHint(error.message) };
      return { ok: true as const, status: late ? "Late" : "On Time" };
    }

    if (!existing) return { ok: false as const, error: "Clock in for this lesson first." };
    if (existing["clock_out_time"]) return { ok: false as const, error: "Lesson already clocked out." };
    const minutes = Math.max(0, toMinutes(time) - toMinutes(String(existing["clock_in_time"] ?? period.start)));
    const { error } = await db
      .from("lesson_attendance")
      .update({
        clock_out_time: time,
        duration_minutes: minutes,
        status: `${String(existing["status"] ?? "On Time")} · Completed`,
        remarks: data.remarks ? data.remarks : existing["remarks"],
      })
      .eq("id", existing["id"]);
    if (error) return { ok: false as const, error: tableHint(error.message) };
    return { ok: true as const, minutes };
  });

function tableHint(message: string) {
  if (message.toLowerCase().includes("lesson_attendance")) {
    return "Lesson clocking storage is missing — run the portal setup SQL in Supabase (Staff → Administration).";
  }
  return message;
}
