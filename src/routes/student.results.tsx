import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { studentResults } from "@/lib/portal.functions";
import { buildOfficialReportCardPDF } from "@/lib/reportCardPdfGenerator";

export const Route = createFileRoute("/student/results")({
  head: () => ({
    meta: [
      { title: "Results & Report Card — Joba International Academy" },
      { name: "description", content: "Term results, grades and downloadable official report card." },
      { property: "og:title", content: "Results & Report Card — Joba International Academy" },
      { property: "og:description", content: "View term scores and download your report card." },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["student-results"],
    queryFn: () => studentResults(),
  });

  if (isLoading || !data) return <p className="text-muted-foreground">Loading results…</p>;

  const scores = data.scores;
  const total = scores.reduce((s, r) => s + Number(r["total"] ?? 0), 0);
  const average = scores.length ? total / scores.length : 0;
  const present = data.attendance.filter((a) => a["status"] === "Present").length;

  function download() {
    if (!data) return;
    const p = data.profile ?? {};
    const doc = buildOfficialReportCardPDF({
      studentName: `${String(p["first_name"] ?? "")} ${String(p["last_name"] ?? "")}`.trim(),
      gender: String(p["gender"] ?? ""),
      admissionId: String(p["admission_id"] ?? ""),
      age: String(p["age"] ?? ""),
      classLevel: String(p["class_level"] ?? ""),
      specializedTrack: String(p["specialized_track"] ?? ""),
      term: String(scores[0]?.["term"] ?? "First Term"),
      session: String(scores[0]?.["session"] ?? ""),
      resumptionDate: "",
      studentsInClass: 0,
      classTeacherName: "",
      totalDaysInTerm: data.attendance.length,
      daysPresent: present,
      daysAbsent: data.attendance.length - present,
      classPosition: "",
      totalScore: total,
      totalObtainable: scores.length * 100,
      averageScore: Number(average.toFixed(1)),
      overallGrade:
        average >= 75 ? "A" : average >= 65 ? "B" : average >= 55 ? "C" : average >= 45 ? "D" : "E",
      subjects: scores.map((s) => ({
        subject: String(s["subject"]),
        ca1: Number(s["ca1"] ?? 0),
        ca2: Number(s["ca2"] ?? 0),
        exam: Number(s["exam"] ?? 0),
        total: Number(s["total"] ?? 0),
        grade: String(s["grade"] ?? ""),
      })),
      affectiveSkills: {},
      psychomotorSkills: {},
      classTeacherRemarks: "",
      principalRemarks: "",
      infoToParents: "",
    });
    doc.save(`report-card-${String(p["admission_id"] ?? "student")}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Results</h1>
        <Button onClick={download} disabled={scores.length === 0}>
          Download report card
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              {["Subject", "CA1", "CA2", "Exam", "Total", "Grade"].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => (
              <tr key={String(s["id"])} className="border-t border-border">
                <td className="px-3 py-2">{String(s["subject"])}</td>
                <td className="px-3 py-2">{String(s["ca1"] ?? "-")}</td>
                <td className="px-3 py-2">{String(s["ca2"] ?? "-")}</td>
                <td className="px-3 py-2">{String(s["exam"] ?? "-")}</td>
                <td className="px-3 py-2 font-semibold">{String(s["total"] ?? "-")}</td>
                <td className="px-3 py-2">{String(s["grade"] ?? "-")}</td>
              </tr>
            ))}
            {scores.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No results published yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {scores.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Total {total} · Average {average.toFixed(1)}%
        </p>
      ) : null}
    </div>
  );
}
