import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireCapability } from "@/lib/route-guards";
import {
  getPortalSettings,
  getTimetable,
  listSubjects,
  saveTimetable,
} from "@/lib/portal.functions";
import {
  TIMETABLE_DAYS,
  emptyTimetable,
  normaliseTimetable,
  slotKey,
  teacherClashes,
  teacherSchedules,
  type ClassTimetable,
  type TimetableData,
} from "@/lib/timetable";
import { downloadClassTimetablePdf, downloadTeacherTimetablePdf } from "@/lib/timetablePdf";

export const Route = createFileRoute("/staff/timetable")({
  beforeLoad: () => requireCapability("timetable.manage"),
  head: () => ({
    meta: [
      { title: "Timetable — Joba International Academy" },
      { name: "description", content: "Set class and teacher schedules and export the timetable as PDF." },
      { property: "og:title", content: "Timetable — Joba International Academy" },
      { property: "og:description", content: "Class and teacher period schedules for the current term." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TimetablePage,
});

function TimetablePage() {
  const settingsQuery = useQuery({ queryKey: ["portal-settings"], queryFn: () => getPortalSettings() });
  const timetableQuery = useQuery({ queryKey: ["timetable"], queryFn: () => getTimetable() });
  const subjectsQuery = useQuery({ queryKey: ["subjects"], queryFn: () => listSubjects() });

  const settings = settingsQuery.data?.settings;
  const classLevels = settings?.academic.classLevels ?? [];
  const teachers = timetableQuery.data?.teachers ?? [];
  const stored = (timetableQuery.data?.data ?? {}) as TimetableData;

  const [classLevel, setClassLevel] = useState("");
  const [day, setDay] = useState<string>(TIMETABLE_DAYS[0]);
  const [table, setTable] = useState<ClassTimetable>(() => emptyTimetable());
  const [busy, setBusy] = useState(false);
  const [teacherFilter, setTeacherFilter] = useState("");

  useEffect(() => {
    if (!classLevel && classLevels.length) setClassLevel(classLevels[0] ?? "");
  }, [classLevels, classLevel]);

  useEffect(() => {
    if (!classLevel) return;
    setTable(stored[classLevel] ? normaliseTimetable(stored[classLevel]) : emptyTimetable());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classLevel, timetableQuery.dataUpdatedAt]);

  const preview: TimetableData = useMemo(
    () => ({ ...stored, ...(classLevel ? { [classLevel]: table } : {}) }),
    [stored, classLevel, table],
  );
  const clashes = useMemo(() => teacherClashes(preview), [preview]);
  const schedules = useMemo(() => teacherSchedules(preview), [preview]);
  const teacherNames = useMemo(
    () => Array.from(new Set([...teachers, ...Object.keys(schedules)])).sort(),
    [teachers, schedules],
  );
  const subjectNames = useMemo(
    () =>
      Array.from(
        new Set(
          (subjectsQuery.data ?? []).map((s: Record<string, unknown>) =>
            String(s["name"] ?? s["subject_name"] ?? s["title"] ?? ""),
          ),
        ),
      ).filter(Boolean),
    [subjectsQuery.data],
  );

  const school = {
    name: settings?.school.name ?? "Joba International Academy",
    address: settings?.school.address ?? "",
    session: settings?.academic.session ?? "",
    term: settings?.academic.term ?? "",
  };

  function updateSlot(index: number, patch: { subject?: string; teacher?: string }) {
    setTable((prev) => {
      const key = slotKey(day, index);
      const current = prev.slots[key] ?? { subject: "", teacher: "" };
      return { ...prev, slots: { ...prev.slots, [key]: { ...current, ...patch } } };
    });
  }

  function updatePeriod(index: number, patch: Partial<{ label: string; start: string; end: string }>) {
    setTable((prev) => ({
      ...prev,
      periods: prev.periods.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  }

  async function handleSave() {
    setBusy(true);
    const res = await saveTimetable({ data: { classLevel, table } });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`${classLevel} timetable saved.`);
    void timetableQuery.refetch();
  }

  const notReady = timetableQuery.data && !timetableQuery.data.ready;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Timetable</h1>
        <p className="text-sm text-muted-foreground">
          Set each class period, assign the teacher, and export class or teacher schedules as PDF.
        </p>
      </div>

      {notReady ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          The settings table is not available yet, so timetables cannot be saved. Run the portal settings SQL from{" "}
          <strong>Staff → Administration</strong> first. You can still build and export a timetable below.
        </p>
      ) : null}

      <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="class">Class</Label>
          <select
            id="class"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={classLevel}
            onChange={(e) => setClassLevel(e.target.value)}
          >
            {classLevels.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="day">Day</Label>
          <select
            id="day"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          >
            {TIMETABLE_DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {clashes.length ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold">Teacher clashes detected</p>
          <ul className="mt-1 list-disc pl-5">
            {clashes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <datalist id="subject-options">
        {subjectNames.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="teacher-options">
        {teacherNames.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <div className="space-y-3">
        {table.periods.map((period, index) => {
          const slot = table.slots[slotKey(day, index)] ?? { subject: "", teacher: "" };
          return (
            <div
              key={`${period.label}-${index}`}
              className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[220px_1fr_1fr]"
            >
              <div className="space-y-2">
                <Input
                  value={period.label}
                  aria-label="Period name"
                  onChange={(e) => updatePeriod(index, { label: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={period.start}
                    aria-label="Start time"
                    onChange={(e) => updatePeriod(index, { start: e.target.value })}
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="time"
                    value={period.end}
                    aria-label="End time"
                    onChange={(e) => updatePeriod(index, { end: e.target.value })}
                  />
                </div>
              </div>
              {period.breakPeriod ? (
                <p className="self-center text-sm text-muted-foreground md:col-span-2">
                  Break / assembly — no lesson scheduled.
                </p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Subject</Label>
                    <Input
                      list="subject-options"
                      value={slot.subject}
                      placeholder="e.g. Mathematics"
                      onChange={(e) => updateSlot(index, { subject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Teacher</Label>
                    <Input
                      list="teacher-options"
                      value={slot.teacher}
                      placeholder="Assign a staff member"
                      onChange={(e) => updateSlot(index, { teacher: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={busy || !classLevel}>
          {busy ? "Saving…" : `Save ${classLevel || "class"} timetable`}
        </Button>
        <Button
          variant="outline"
          disabled={!classLevel}
          onClick={() => downloadClassTimetablePdf(classLevel, table, school)}
        >
          Download class timetable PDF
        </Button>
      </div>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="font-display text-lg font-semibold">Teacher schedules</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <Label htmlFor="teacher">Teacher</Label>
            <select
              id="teacher"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
            >
              <option value="">Select a teacher</option>
              {teacherNames.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            disabled={!teacherFilter}
            onClick={() => downloadTeacherTimetablePdf(teacherFilter, preview, school)}
          >
            Download teacher PDF
          </Button>
        </div>

        {teacherFilter ? (
          <ul className="space-y-2 text-sm">
            {(schedules[teacherFilter] ?? []).map((e) => (
              <li
                key={`${e.day}-${e.periodIndex}-${e.classLevel}`}
                className="flex flex-wrap justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <span className="font-medium">
                  {e.day} · {e.period.label}
                </span>
                <span className="text-muted-foreground">
                  {e.period.start}–{e.period.end} · {e.classLevel} · {e.subject || "—"}
                </span>
              </li>
            ))}
            {(schedules[teacherFilter] ?? []).length === 0 ? (
              <li className="text-muted-foreground">No periods assigned yet.</li>
            ) : null}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
