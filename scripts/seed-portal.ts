/**
 * Seeds real-looking academic data into the school's Supabase project:
 * students, subject registrations, assignments, exam scores, term reports,
 * attendance and fee payments — plus staff clocking history.
 *
 * Run with: bun scripts/seed-portal.ts
 */
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env["PORTAL_SUPABASE_URL"]!,
  process.env["PORTAL_SUPABASE_SERVICE_ROLE_KEY"]!,
  { auth: { persistSession: false } },
);

const SESSION = "2026/2027";
const TERM = "1st Term";
const STUDENT_PASSWORD = "Joba@2026";

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const JSS_SUBJECTS = [
  "Mathematics",
  "English Language",
  "Basic Science",
  "Basic Technology",
  "Social Studies",
  "Civic Education",
  "Business Studies",
  "ICT & Computer Studies",
  "Agricultural Science",
  "Cultural & Creative Arts",
];

const SSS_SCIENCE = [
  "Mathematics",
  "English Language",
  "Physics",
  "Chemistry",
  "Biology",
  "Further Mathematics",
  "Civic Education",
  "Data Processing",
  "Agricultural Science",
];

const SSS_ARTS = [
  "Mathematics",
  "English Language",
  "Literature-in-English",
  "Government",
  "Christian Religious Studies",
  "Economics",
  "Civic Education",
  "Data Processing",
  "Geography",
];

type Seed = {
  id: string;
  surname: string;
  first_name: string;
  other_name: string;
  gender: "Male" | "Female";
  dob: string;
  class_level: string;
  track: string;
  guardian: string;
  guardian_phone: string;
  guardian_email: string;
  email: string;
  option: string;
  band: number; // performance band 0..1
};

const STUDENTS: Seed[] = [
  {
    id: "JIA-2026-2201",
    surname: "Okafor",
    first_name: "Adaeze",
    other_name: "Chidinma",
    gender: "Female",
    dob: "2013-04-11",
    class_level: "JSS 2",
    track: "",
    guardian: "Mrs. Ngozi Okafor",
    guardian_phone: "08034567890",
    guardian_email: "ngozi.okafor@gmail.com",
    email: "adaeze.okafor@student.jobamultiltd.com",
    option: "Day Schooling",
    band: 0.93,
  },
  {
    id: "JIA-2026-2202",
    surname: "Adeyemi",
    first_name: "Tunde",
    other_name: "Ayomide",
    gender: "Male",
    dob: "2012-09-02",
    class_level: "JSS 3",
    track: "",
    guardian: "Mr. Kunle Adeyemi",
    guardian_phone: "08123456701",
    guardian_email: "kunle.adeyemi@yahoo.com",
    email: "tunde.adeyemi@student.jobamultiltd.com",
    option: "Boarding",
    band: 0.78,
  },
  {
    id: "JIA-2026-2203",
    surname: "Balogun",
    first_name: "Fisayo",
    other_name: "Grace",
    gender: "Female",
    dob: "2011-01-24",
    class_level: "SSS 1",
    track: "Science",
    guardian: "Dr. Bola Balogun",
    guardian_phone: "07039991122",
    guardian_email: "bola.balogun@gmail.com",
    email: "fisayo.balogun@student.jobamultiltd.com",
    option: "Day Schooling",
    band: 0.86,
  },
  {
    id: "JIA-2026-2204",
    surname: "Eze",
    first_name: "Chukwuemeka",
    other_name: "Daniel",
    gender: "Male",
    dob: "2010-07-19",
    class_level: "SSS 2",
    track: "Science",
    guardian: "Mr. Emeka Eze",
    guardian_phone: "08066554433",
    guardian_email: "emeka.eze@gmail.com",
    email: "emeka.eze@student.jobamultiltd.com",
    option: "Boarding",
    band: 0.71,
  },
  {
    id: "JIA-2026-2205",
    surname: "Ibrahim",
    first_name: "Zainab",
    other_name: "Amina",
    gender: "Female",
    dob: "2010-11-05",
    class_level: "SSS 2",
    track: "Arts",
    guardian: "Alhaji Musa Ibrahim",
    guardian_phone: "08155667788",
    guardian_email: "musa.ibrahim@gmail.com",
    email: "zainab.ibrahim@student.jobamultiltd.com",
    option: "Day Schooling",
    band: 0.82,
  },
  {
    id: "JIA-2026-2206",
    surname: "Olamide",
    first_name: "Samuel",
    other_name: "Oluwaseun",
    gender: "Male",
    dob: "2013-02-14",
    class_level: "JSS 2",
    track: "",
    guardian: "Mrs. Yetunde Olamide",
    guardian_phone: "09022334455",
    guardian_email: "yetunde.olamide@gmail.com",
    email: "samuel.olamide@student.jobamultiltd.com",
    option: "Day Schooling",
    band: 0.64,
  },
];

// Existing profiles already in the database that also need academic records.
const EXISTING: { admission_id: string; class_level: string; band: number; track: string }[] = [
  { admission_id: "JIA/2026/J1948", class_level: "JSS 1", band: 0.8, track: "" },
  { admission_id: "JIA-2026-1082", class_level: "JSS 1", band: 0.88, track: "" },
  { admission_id: "JIA-2026-4795", class_level: "JSS 1", band: 0.69, track: "" },
];

function subjectsFor(classLevel: string, track: string) {
  if (classLevel.startsWith("JSS")) return JSS_SUBJECTS;
  return track === "Arts" ? SSS_ARTS : SSS_SCIENCE;
}

function gradeOf(total: number) {
  return total >= 75 ? "A" : total >= 65 ? "B" : total >= 55 ? "C" : total >= 45 ? "D" : total >= 40 ? "E" : "F";
}

function remarkOf(total: number) {
  return total >= 75
    ? "Excellent"
    : total >= 65
      ? "Very Good"
      : total >= 55
        ? "Good"
        : total >= 45
          ? "Fair"
          : total >= 40
            ? "Pass"
            : "Needs Improvement";
}

/** Deterministic pseudo random so re-runs produce the same records. */
function rng(seed: string) {
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return Math.abs(h % 1000) / 1000;
  };
}

async function seedAdmissionsAndProfiles(hash: string) {
  const admissions = STUDENTS.map((s) => ({
    id: s.id,
    surname: s.surname,
    first_name: s.first_name,
    other_name: s.other_name,
    date_of_birth: s.dob,
    age: 2026 - Number(s.dob.slice(0, 4)),
    gender: s.gender,
    nationality: "Nigerian",
    state_of_origin: "Osun",
    local_government: "Ilesa West",
    residential_address: "Okeola Street, Isokun, Ilesa",
    religion: "Christianity",
    blood_group: "O+",
    genotype: "AA",
    phone_number: s.guardian_phone,
    email: s.guardian_email,
    home_address: "Okeola Street, Isokun, Ilesa",
    city_town: "Ilesa",
    state: "Osun",
    guardian_name: s.guardian,
    guardian_phone: s.guardian_phone,
    guardian_email: s.guardian_email,
    guardian_occupation: "Business",
    last_school_attended: "Ilesa Grammar School",
    last_class_completed: s.class_level,
    emergency_contact_name: s.guardian,
    emergency_contact_phone: s.guardian_phone,
    class_applying_for: s.class_level,
    specialized_track: s.track,
    schooling_option: s.option,
    amount_paid: 285500,
    payment_status: "Confirmed",
    payment_reference: `BANK-${s.id.slice(-4)}`,
    updated_at: new Date().toISOString(),
  }));
  const a = await db.from("admissions").upsert(admissions, { onConflict: "id" });
  if (a.error) throw a.error;

  const profiles = STUDENTS.map((s) => ({
    admission_id: s.id,
    student_email: s.email,
    guardian_email: s.guardian_email,
    first_name: s.first_name,
    last_name: s.surname,
    class_level: s.class_level,
    specialized_track: s.track,
    schooling_option: s.option,
    portal_password_hash: hash,
    updated_at: new Date().toISOString(),
  }));
  const p = await db.from("student_profiles").upsert(profiles, { onConflict: "admission_id" });
  if (p.error) throw p.error;

  // Give the pre-existing profiles a usable portal password too.
  for (const e of EXISTING) {
    await db
      .from("student_profiles")
      .update({ portal_password_hash: hash })
      .eq("admission_id", e.admission_id);
  }
}

type Roster = { admission_id: string; class_level: string; track: string; band: number };

async function seedSubjects(roster: Roster[]) {
  const rows = roster.map((r) => ({
    admission_id: r.admission_id,
    class_level: r.class_level,
    selected_subjects: subjectsFor(r.class_level, r.track),
    trade_subject: r.class_level.startsWith("SSS") ? "Data Processing" : null,
    music_instrument: "Piano",
    ict_track: "Web Development & Coding",
    extra_curricular: ["Debate Club", "Press Club"],
    updated_at: new Date().toISOString(),
  }));
  const { error } = await db
    .from("student_subject_registrations")
    .upsert(rows, { onConflict: "admission_id" });
  if (error) throw error;
}

async function seedScoresAndReports(roster: Roster[]) {
  for (const r of roster) {
    const subjects = subjectsFor(r.class_level, r.track);
    const rand = rng(r.admission_id);
    const scoreRows = subjects.map((subject) => {
      const base = r.band * 100;
      const jitter = (rand() - 0.5) * 22;
      const total = Math.max(35, Math.min(98, Math.round(base + jitter)));
      const ca1 = Math.round(Math.min(20, total * 0.2 + (rand() - 0.5) * 2));
      const ca2 = Math.round(Math.min(20, total * 0.2 + (rand() - 0.5) * 2));
      const exam = total - ca1 - ca2;
      const highest = Math.min(99, total + Math.round(rand() * 9) + 1);
      const lowest = Math.max(28, total - Math.round(rand() * 25) - 5);
      return {
        admission_id: r.admission_id,
        term: TERM,
        session: SESSION,
        subject,
        exam_type: "Terminal Exam",
        score: total,
        ca1_score: ca1,
        ca2_score: ca2,
        exam_score: exam,
        total_score: total,
        grade: gradeOf(total),
        subject_position: `${1 + Math.round(rand() * 12)}${["st", "nd", "rd", "th"][Math.min(3, Math.round(rand() * 3))]}`,
        subject_highest: highest,
        subject_lowest: lowest,
        subject_average: Math.round((highest + lowest) / 2),
        teacher_remarks: remarkOf(total),
        remarks: remarkOf(total),
        updated_at: new Date().toISOString(),
      };
    });

    await db
      .from("exam_scores")
      .delete()
      .eq("admission_id", r.admission_id)
      .eq("term", TERM)
      .eq("session", SESSION);
    const s = await db.from("exam_scores").insert(scoreRows);
    if (s.error) throw s.error;

    const total = scoreRows.reduce((sum, x) => sum + x.total_score, 0);
    const obtainable = scoreRows.length * 100;
    const average = Number((total / scoreRows.length).toFixed(2));
    const position = r.band > 0.9 ? "1st" : r.band > 0.85 ? "2nd" : r.band > 0.8 ? "4th" : r.band > 0.75 ? "7th" : "11th";
    const daysPresent = 108 + Math.round(rand() * 8);

    await db
      .from("student_term_reports")
      .delete()
      .eq("admission_id", r.admission_id)
      .eq("term", TERM)
      .eq("session", SESSION);
    const rep = await db.from("student_term_reports").insert({
      admission_id: r.admission_id,
      term: TERM,
      session: SESSION,
      total_score: total,
      total_obtainable: obtainable,
      average_score: average,
      overall_grade: gradeOf(average),
      class_position: position,
      total_students: 24,
      total_days_in_term: 120,
      days_present: daysPresent,
      days_absent: 120 - daysPresent,
      class_teacher_remarks:
        average >= 75
          ? "A diligent and consistent learner. Keep up the excellent work."
          : average >= 60
            ? "A good result. More attention to written assignments will lift the average."
            : "Improvement noted, but more effort is required in core subjects.",
      principal_remarks:
        average >= 75
          ? "Outstanding performance. Promoted to the next class."
          : average >= 50
            ? "Satisfactory performance. Promoted on trial."
            : "Below expectation. Extra coaching recommended.",
      next_term_resumption: "Monday, 5th January 2027",
      info_to_parents:
        "Kindly settle all outstanding fees before resumption. Report cards must be signed and returned.",
      affective_skills: {
        Punctuality: 5,
        Neatness: 4,
        Politeness: 5,
        Honesty: 5,
        "Attentiveness in class": average >= 70 ? 5 : 4,
        "Relationship with others": 4,
      },
      psychomotor_skills: {
        Handwriting: 4,
        "Sports & Games": 4,
        "Musical Skills": 5,
        "Drawing & Painting": 3,
        "Practical/ICT Skills": average >= 70 ? 5 : 4,
      },
      updated_at: new Date().toISOString(),
    });
    if (rep.error) throw rep.error;

    await db
      .from("attendance_records")
      .delete()
      .eq("admission_id", r.admission_id)
      .eq("term", TERM)
      .eq("session", SESSION);
    const att = await db.from("attendance_records").insert({
      admission_id: r.admission_id,
      term: TERM,
      session: SESSION,
      total_days: 120,
      days_present: daysPresent,
      days_absent: 120 - daysPresent,
      days_late: Math.round(rand() * 5),
      percentage: Number(((daysPresent / 120) * 100).toFixed(2)),
      updated_at: new Date().toISOString(),
    });
    if (att.error) throw att.error;
  }
}

async function seedFees(roster: Roster[]) {
  const rows: Record<string, unknown>[] = [];
  for (const r of roster) {
    const boarding = r.class_level.startsWith("SSS");
    rows.push({
      admission_id: r.admission_id,
      payment_type: "Tuition Fee",
      description: `${TERM} ${SESSION} tuition`,
      amount: boarding ? 285500 : 185000,
      reference: `JIA-TUI-${r.admission_id.slice(-4)}-T1`,
      status: "Paid",
    });
    rows.push({
      admission_id: r.admission_id,
      payment_type: "Books & Materials",
      description: "Textbooks, exercise books and stationery",
      amount: 42500,
      reference: `JIA-BKS-${r.admission_id.slice(-4)}-T1`,
      status: "Paid",
    });
    rows.push({
      admission_id: r.admission_id,
      payment_type: "Uniform & Kits",
      description: "School uniform, sports wear and house kit",
      amount: 38000,
      reference: `JIA-UNI-${r.admission_id.slice(-4)}-T1`,
      status: r.band > 0.8 ? "Paid" : "Pending",
    });
    if (boarding) {
      rows.push({
        admission_id: r.admission_id,
        payment_type: "Boarding & Feeding",
        description: `${TERM} boarding and feeding levy`,
        amount: 165000,
        reference: `JIA-BRD-${r.admission_id.slice(-4)}-T1`,
        status: "Pending",
      });
    }
  }
  const { error } = await db.from("fee_payments").upsert(rows, { onConflict: "reference" });
  if (error) throw error;
}

async function seedAssignments(roster: Roster[]) {
  const defs = [
    { title: "Algebraic Expressions Worksheet", subject: "Mathematics", class_level: "JSS 2", teacher_name: "Faluyi Theophilus O", days: 4 },
    { title: "Comprehension & Summary Writing", subject: "English Language", class_level: "JSS 2", teacher_name: "Ajayi O.O", days: 7 },
    { title: "Simple Machines Practical Report", subject: "Basic Science", class_level: "JSS 3", teacher_name: "Faluyi Theophilus O", days: 5 },
    { title: "Spreadsheet Formulas Lab", subject: "ICT & Computer Studies", class_level: "JSS 1", teacher_name: "Jesutobiloba Precious", days: 3 },
    { title: "Motion & Newton's Laws Problem Set", subject: "Physics", class_level: "SSS 1", teacher_name: "Faluyi Theophilus O", days: 6 },
    { title: "Organic Chemistry Nomenclature", subject: "Chemistry", class_level: "SSS 2", teacher_name: "Faluyi Theophilus O", days: 8 },
    { title: "Essay: Federalism in Nigeria", subject: "Government", class_level: "SSS 2", teacher_name: "Ajayi O.O", days: 6 },
  ];

  const created: { id: string; class_level: string; due: string }[] = [];
  for (const d of defs) {
    const due = new Date(Date.now() + d.days * 86400000).toISOString();
    const { data: existing } = await db
      .from("assignments")
      .select("id")
      .eq("title", d.title)
      .eq("class_level", d.class_level)
      .maybeSingle();
    if (existing) {
      await db.from("assignments").update({ due_date: due }).eq("id", existing["id"]);
      created.push({ id: String(existing["id"]), class_level: d.class_level, due });
      continue;
    }
    const { data, error } = await db
      .from("assignments")
      .insert({
        title: d.title,
        subject: d.subject,
        class_level: d.class_level,
        due_date: due,
        total_score: 100,
        instructions: "Complete all questions neatly and submit through the student portal before the due date.",
        teacher_name: d.teacher_name,
      })
      .select("id")
      .single();
    if (error) throw error;
    created.push({ id: String(data["id"]), class_level: d.class_level, due });
  }

  for (const r of roster) {
    const rand = rng(`asg-${r.admission_id}`);
    for (const a of created.filter((c) => c.class_level === r.class_level)) {
      const graded = rand() > 0.4;
      const { data: existing } = await db
        .from("student_assignments")
        .select("id")
        .eq("admission_id", r.admission_id)
        .eq("assignment_id", a.id)
        .maybeSingle();
      const row = {
        admission_id: r.admission_id,
        assignment_id: a.id,
        status: graded ? "Graded" : "Pending",
        score: graded ? Math.round(r.band * 100 - rand() * 12) : null,
        submitted_at: graded ? new Date(Date.now() - 86400000).toISOString() : null,
        due_date: a.due,
        feedback: graded ? "Well presented. Mind your working steps." : null,
      };
      if (existing) await db.from("student_assignments").update(row).eq("id", existing["id"]);
      else {
        const { error } = await db.from("student_assignments").insert(row);
        if (error) throw error;
      }
    }
  }
}

async function seedStaffAttendance() {
  const { data: staff } = await db.from("staff_users").select("staff_id, full_name, email, department");
  if (!staff) return;
  const rows: Record<string, unknown>[] = [];
  for (let back = 1; back <= 14; back++) {
    const d = new Date();
    d.setDate(d.getDate() - back);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const date = d.toISOString().slice(0, 10);
    for (const s of staff) {
      const rand = rng(`${s["staff_id"]}-${date}`);
      const late = rand() > 0.82;
      const absent = rand() > 0.94;
      if (absent) {
        rows.push({
          id: `att-${String(s["staff_id"]).toLowerCase()}-${date}`,
          staff_id: s["staff_id"],
          staff_name: s["full_name"],
          email: s["email"],
          department: s["department"],
          date,
          status: "Excused",
          arrival_status: "Excused Delay",
          remarks: "Official assignment outside the school",
          recorded_by: "Principal Directorate",
        });
        continue;
      }
      rows.push({
        id: `att-${String(s["staff_id"]).toLowerCase()}-${date}`,
        staff_id: s["staff_id"],
        staff_name: s["full_name"],
        email: s["email"],
        department: s["department"],
        date,
        clock_in_time: late ? "08:24 AM" : "07:41 AM",
        clock_out_time: "03:58 PM",
        status: late ? "Late" : "Present",
        arrival_status: late ? "Late (15-30m)" : "On Time",
        work_duration_hours: late ? 7.5 : 8.25,
        remarks: "",
        recorded_by: "Principal Directorate",
      });
    }
  }
  const { error } = await db
    .from("staff_attendance")
    .upsert(rows, { onConflict: "staff_id,date" });
  if (error) throw error;
}

async function seedNotices() {
  const notices = [
    {
      title: "First Term Examinations Begin 24th November",
      content:
        "All students are to note that the First Term terminal examinations commence on Monday, 24th November 2026. Timetables have been pasted on class notice boards.",
      type: "warning",
      author: "Principal's Office",
      date_posted: "2026-11-10",
    },
    {
      title: "Inter-House Sports & Cultural Day",
      content:
        "The annual Inter-House Sports and Cultural Day holds on Friday, 21st November 2026 at the school field. Parents are warmly invited.",
      type: "info",
      author: "Sports Directorate",
      date_posted: "2026-11-04",
    },
    {
      title: "Outstanding Fees Reminder",
      content:
        "Guardians with outstanding balances are kindly requested to settle them at the Bursary before the examination week.",
      type: "warning",
      author: "Bursary & Accounts Directorate",
      date_posted: "2026-11-01",
    },
  ];
  for (const n of notices) {
    const { data: existing } = await db.from("notices").select("id").eq("title", n.title).maybeSingle();
    if (!existing) await db.from("notices").insert(n);
  }
}

async function main() {
  const hash = await sha256(STUDENT_PASSWORD);
  await seedAdmissionsAndProfiles(hash);

  const roster: Roster[] = [
    ...STUDENTS.map((s) => ({
      admission_id: s.id,
      class_level: s.class_level,
      track: s.track,
      band: s.band,
    })),
    ...EXISTING.map((e) => ({
      admission_id: e.admission_id,
      class_level: e.class_level,
      track: e.track,
      band: e.band,
    })),
  ];

  await seedSubjects(roster);
  await seedScoresAndReports(roster);
  await seedFees(roster);
  await seedAssignments(roster);
  await seedStaffAttendance();
  await seedNotices();

  console.log(`Seeded ${roster.length} students. Student portal password: ${STUDENT_PASSWORD}`);
}

await main();
