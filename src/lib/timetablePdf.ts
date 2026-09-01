import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  TIMETABLE_DAYS,
  normaliseTimetable,
  slotKey,
  teacherSchedules,
  type ClassTimetable,
  type TimetableData,
} from "./timetable";

type SchoolInfo = { name: string; address: string; session: string; term: string };

const NAVY: [number, number, number] = [16, 32, 66];
const GOLD: [number, number, number] = [201, 162, 39];

function header(doc: jsPDF, school: SchoolInfo, title: string) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, width, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(school.name, width / 2, 24, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(school.address, width / 2, 37, { align: "center", maxWidth: width - 80 });
  doc.setFillColor(...GOLD);
  doc.rect(0, 60, width, 3, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, width / 2, 82, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${school.term} · ${school.session} Academic Session`, width / 2, 96, { align: "center" });
  return 108;
}

function footer(doc: jsPDF) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated ${new Date().toLocaleDateString("en-GB")}`, 40, height - 20);
  doc.text("Official school timetable", width - 40, height - 20, { align: "right" });
}

export function downloadClassTimetablePdf(
  classLevel: string,
  table: ClassTimetable,
  school: SchoolInfo,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const startY = header(doc, school, `Class Timetable — ${classLevel}`);
  const t = normaliseTimetable(table);

  const head = [["Period / Time", ...TIMETABLE_DAYS]];
  const body = t.periods.map((period, index) => {
    const first = `${period.label}\n${period.start} - ${period.end}`;
    if (period.breakPeriod) return [first, ...TIMETABLE_DAYS.map(() => period.label.toUpperCase())];
    return [
      first,
      ...TIMETABLE_DAYS.map((day) => {
        const slot = t.slots[slotKey(day, index)];
        if (!slot?.subject && !slot?.teacher) return "—";
        return [slot?.subject, slot?.teacher ? `(${slot.teacher})` : ""].filter(Boolean).join("\n");
      }),
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY,
    styles: { fontSize: 8, cellPadding: 5, valign: "middle", halign: "center", lineColor: [210, 210, 210], lineWidth: 0.5 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 90, halign: "left", fontStyle: "bold" } },
    alternateRowStyles: { fillColor: [248, 248, 250] },
    margin: { left: 30, right: 30 },
  });

  footer(doc);
  doc.save(`timetable-${classLevel.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

export function downloadTeacherTimetablePdf(teacher: string, data: TimetableData, school: SchoolInfo) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const startY = header(doc, school, `Teacher Timetable — ${teacher}`);
  const entries = teacherSchedules(data)[teacher] ?? [];

  autoTable(doc, {
    head: [["Day", "Period", "Time", "Class", "Subject"]],
    body: entries.length
      ? entries.map((e) => [e.day, e.period.label, `${e.period.start} - ${e.period.end}`, e.classLevel, e.subject || "—"])
      : [["—", "—", "—", "—", "No periods assigned"]],
    startY,
    styles: { fontSize: 9, cellPadding: 6, lineColor: [210, 210, 210], lineWidth: 0.5 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 250] },
    margin: { left: 40, right: 40 },
  });

  footer(doc);
  doc.save(`timetable-${teacher.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
