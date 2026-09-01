import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { getPortalSettings } from "@/lib/portal.functions";
import { getParentUser, parentResults } from "@/lib/parent.functions";
import { buildOfficialReportCardPDF } from "@/lib/reportCardPdfGenerator";

export const Route = createFileRoute("/parent/results")({
  head: () => ({
    meta: [
      { title: "Child Results & Report Card — Parent Portal" },
      {
        name: "description",
        content: "Guardians can review termly results and download the official report card PDF.",
      },
      { property: "og:title", content: "Child Results & Report Card — Parent Portal" },
      {
        property: "og:description",
        content: "Termly scores, grades and the official downloadable report card.",
      },
    ],
  }),
  component: ParentResults,
});

function ParentResults() {
  const navigate = useNavigate();
  const { data: parent, isLoading: loadingUser } = useQuery({
    queryKey: ["parent-user"],
    queryFn: () => getParentUser(),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["parent-results"],
    queryFn: () => parentResults(),
    enabled: !!parent,
  });
  const { data: settings } = useQuery({
    queryKey: ["portal-settings"],
    queryFn: () => getPortalSettings(),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!loadingUser && !parent) void navigate({ to: "/parent" });
  }, [loadingUser, parent, navigate]);

  if (loadingUser || !parent) return <p className="text-muted-foreground">Checking access…</p>;
  if (isLoading || !data) return <p className="text-muted-foreground">Loading results…</p>;

  if (settings && !settings.settings.portal.resultsPublished) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="font-display text-2xl font-bold">Results</h1>
        <p className="mt-2 text-muted-foreground">
          Results for this term have not been released yet. Please check back after the school
          publishes them.
        </p>
      </div>
    );
  }

  const scores = data.scores;
  const report = (data.reports[0] ?? {}) as Record<string, unknown>;
  const att = (data.attendance[0] ?? {}) as Record<string, unknown>;
  const total = scores.reduce((s, r) => s + Number(r["total_score"] ?? 0), 0);
  const average = scores.length ? total / scores.length : 0;

  function download() {
    if (!data) return;
    const p = (data.profile ?? {}) as Record<string, unknown>;
    const doc = buildOfficialReportCardPDF({
      studentName: `${String(p["first_name"] ?? "")} ${String(p["last_name"] ?? "")}`.trim(),
      gender: String(p["gender"] ?? ""),
      admissionId: String(p["admission_id"] ?? ""),
      age: String(p["age"] ?? ""),
      classLevel: String(p["class_level"] ?? ""),
      specializedTrack: String(p["specialized_track"] ?? ""),
      term: String(report["term"] ?? scores[0]?.["term"] ?? "First Term"),
      session: String(report["session"] ?? scores[0]?.["session"] ?? ""),
      resumptionDate: String(report["next_term_resumption"] ?? ""),
      studentsInClass: Number(report["total_students"] ?? 0),
      classTeacherName: "",
      totalDaysInTerm: Number(report["total_days_in_term"] ?? att["total_days"] ?? 0),
      daysPresent: Number(report["days_present"] ?? att["days_present"] ?? 0),
      daysAbsent: Number(report["days_absent"] ?? att["days_absent"] ?? 0),
      classPosition: String(report["class_position"] ?? ""),
      totalScore: Number(report["total_score"] ?? total),
      totalObtainable: Number(report["total_obtainable"] ?? scores.length * 100),
      averageScore: Number(report["average_score"] ?? average.toFixed(1)),
      overallGrade: String(
        report["overall_grade"] ??
          (average >= 75 ? "A" : average >= 65 ? "B" : average >= 55 ? "C" : average >= 45 ? "D" : "E"),
      ),
      subjects: scores.map((s) => ({
        subject: String(s["subject"]),
        ca1: Number(s["ca1_score"] ?? 0),
        ca2: Number(s["ca2_score"] ?? 0),
        exam: Number(s["exam_score"] ?? 0),
        total: Number(s["total_score"] ?? 0),
        grade: String(s["grade"] ?? ""),
        position: s["subject_position"] ? String(s["subject_position"]) : undefined,
        highest: s["subject_highest"] != null ? Number(s["subject_highest"]) : undefined,
        lowest: s["subject_lowest"] != null ? Number(s["subject_lowest"]) : undefined,
        average: s["subject_average"] != null ? Number(s["subject_average"]) : undefined,
        remark: s["teacher_remarks"] ? String(s["teacher_remarks"]) : undefined,
      })),
      affectiveSkills: (report["affective_skills"] as Record<string, number>) ?? {},
      psychomotorSkills: (report["psychomotor_skills"] as Record<string, number>) ?? {},
      classTeacherRemarks: String(report["class_teacher_remarks"] ?? ""),
      principalRemarks: String(report["principal_remarks"] ?? ""),
      infoToParents: String(report["info_to_parents"] ?? ""),
    });
    doc.save(`report-card-${String(p["admission_id"] ?? "student")}.pdf`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Results</h1>
          <p className="text-sm text-muted-foreground">
            {String(report["term"] ?? scores[0]?.["term"] ?? "")}{" "}
            {String(report["session"] ?? scores[0]?.["session"] ?? "")}
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={download} disabled={scores.length === 0}>
          Download report card
        </Button>
      </div>

      <div className="space-y-3 sm:hidden">
        {scores.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
            No results published yet.
          </p>
        ) : null}
        {scores.map((s) => (
          <div key={`m-${String(s["id"])}`} className="rounded-lg border border-border bg-card p-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <p className="min-w-0 break-words font-medium">{String(s["subject"])}</p>
              <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs font-semibold">
                {String(s["grade"] ?? "-")}
              </span>
            </div>
            <dl className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
              {[
                ["CA1", s["ca1_score"]],
                ["CA2", s["ca2_score"]],
                ["Exam", s["exam_score"]],
                ["Total", s["total_score"]],
              ].map(([label, val]) => (
                <div key={String(label)} className="rounded bg-muted/50 py-1.5">
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {String(label)}
                  </dt>
                  <dd className="font-semibold">{String(val ?? "-")}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
        <table className="w-full min-w-[34rem] text-sm">
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
                <td className="px-3 py-2 whitespace-nowrap">{String(s["subject"])}</td>
                <td className="px-3 py-2">{String(s["ca1_score"] ?? "-")}</td>
                <td className="px-3 py-2">{String(s["ca2_score"] ?? "-")}</td>
                <td className="px-3 py-2">{String(s["exam_score"] ?? "-")}</td>
                <td className="px-3 py-2 font-semibold">{String(s["total_score"] ?? "-")}</td>
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
