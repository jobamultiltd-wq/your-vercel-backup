/** Client-safe timetable model for the Joba portal. */

export const TIMETABLE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
export type TimetableDay = (typeof TIMETABLE_DAYS)[number];

export type TimetablePeriod = {
  label: string;
  start: string;
  end: string;
  /** Break/assembly rows are not teaching periods. */
  breakPeriod?: boolean;
};

export type TimetableSlot = { subject: string; teacher: string };

export type ClassTimetable = {
  periods: TimetablePeriod[];
  /** key: `${day}|${periodIndex}` */
  slots: Record<string, TimetableSlot>;
};

/** key: class level */
export type TimetableData = Record<string, ClassTimetable>;

export const DEFAULT_PERIODS: TimetablePeriod[] = [
  { label: "Assembly", start: "07:45", end: "08:00", breakPeriod: true },
  { label: "Period 1", start: "08:00", end: "08:40" },
  { label: "Period 2", start: "08:40", end: "09:20" },
  { label: "Period 3", start: "09:20", end: "10:00" },
  { label: "Short Break", start: "10:00", end: "10:20", breakPeriod: true },
  { label: "Period 4", start: "10:20", end: "11:00" },
  { label: "Period 5", start: "11:00", end: "11:40" },
  { label: "Long Break", start: "11:40", end: "12:10", breakPeriod: true },
  { label: "Period 6", start: "12:10", end: "12:50" },
  { label: "Period 7", start: "12:50", end: "13:30" },
];

export function slotKey(day: string, periodIndex: number) {
  return `${day}|${periodIndex}`;
}

export function emptyTimetable(): ClassTimetable {
  return { periods: structuredClone(DEFAULT_PERIODS), slots: {} };
}

export function normaliseTimetable(value: unknown): ClassTimetable {
  const raw = (value ?? {}) as Partial<ClassTimetable>;
  const periods = Array.isArray(raw.periods) && raw.periods.length ? raw.periods : structuredClone(DEFAULT_PERIODS);
  return { periods, slots: (raw.slots as Record<string, TimetableSlot>) ?? {} };
}

export type TeacherEntry = {
  day: string;
  periodIndex: number;
  period: TimetablePeriod;
  classLevel: string;
  subject: string;
};

/** Flatten every class timetable into a per-teacher schedule. */
export function teacherSchedules(data: TimetableData): Record<string, TeacherEntry[]> {
  const out: Record<string, TeacherEntry[]> = {};
  for (const [classLevel, table] of Object.entries(data ?? {})) {
    const t = normaliseTimetable(table);
    for (const [key, slot] of Object.entries(t.slots)) {
      const teacher = (slot?.teacher ?? "").trim();
      if (!teacher) continue;
      const [day, idxRaw] = key.split("|");
      const periodIndex = Number(idxRaw);
      const period = t.periods[periodIndex];
      if (!day || !period) continue;
      (out[teacher] ??= []).push({
        day,
        periodIndex,
        period,
        classLevel,
        subject: (slot.subject ?? "").trim(),
      });
    }
  }
  for (const list of Object.values(out)) {
    list.sort(
      (a, b) =>
        TIMETABLE_DAYS.indexOf(a.day as TimetableDay) - TIMETABLE_DAYS.indexOf(b.day as TimetableDay) ||
        a.periodIndex - b.periodIndex,
    );
  }
  return out;
}

/** Detect teachers booked twice in the same day/period across classes. */
export function teacherClashes(data: TimetableData): string[] {
  const seen = new Map<string, string[]>();
  for (const [classLevel, table] of Object.entries(data ?? {})) {
    const t = normaliseTimetable(table);
    for (const [key, slot] of Object.entries(t.slots)) {
      const teacher = (slot?.teacher ?? "").trim();
      if (!teacher) continue;
      const id = `${teacher.toLowerCase()}|${key}`;
      const list = seen.get(id) ?? [];
      list.push(classLevel);
      seen.set(id, list);
    }
  }
  const clashes: string[] = [];
  for (const [id, classes] of seen) {
    if (classes.length < 2) continue;
    const [teacher, day, idx] = id.split("|");
    clashes.push(`${teacher} — ${day} period ${Number(idx) + 1} (${classes.join(", ")})`);
  }
  return clashes;
}
