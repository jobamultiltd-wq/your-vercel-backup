/** Client-safe portal settings shape and defaults. */

export type SchoolSettings = {
  name: string;
  shortName: string;
  motto: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  principalName: string;
};

export type AcademicSettings = {
  session: string;
  term: string;
  resumptionDate: string;
  classLevels: string[];
  gradingScale: string;
};

export type PortalToggles = {
  admissionsOpen: boolean;
  careersOpen: boolean;
  coachingOpen: boolean;
  resultsPublished: boolean;
  announcement: string;
  defaultStudentPassword: string;
};

export type PortalSettings = {
  school: SchoolSettings;
  academic: AcademicSettings;
  portal: PortalToggles;
};

export const DEFAULT_SETTINGS: PortalSettings = {
  school: {
    name: "Joba International Academy",
    shortName: "Joba Academy",
    motto: "Virtute et Devotione (By Virtue and Devotion)",
    address: "B74 Araromi Street (Small London), behind Lifesupport Diagnostic Centre, Ilesa, Osun State",
    phone: "0705 065 6140",
    email: "academy@jobamultiltd.com",
    website: "https://jobamultiltd.com",
    logoUrl: "",
    principalName: "",
  },
  academic: {
    session: "2026/2027",
    term: "1st Term",
    resumptionDate: "",
    classLevels: [
      "JSS 1",
      "JSS 2",
      "JSS 3",
      "SSS 1",
      "SSS 2",
      "SSS 3",
    ],
    gradingScale: "A: 80-100 · B: 65-79 · C: 50-64 · D: 45-49 · F: 0-44",
  },
  portal: {
    admissionsOpen: true,
    careersOpen: true,
    coachingOpen: true,
    resultsPublished: true,
    announcement: "",
    defaultStudentPassword: "Joba@2026",
  },
};

export const STAFF_ROLES = [
  "admin",
  "principal",
  "teacher",
  "form_teacher",
  "bursar",
  "registrar",
  "counsellor",
] as const;

export const SETTINGS_TABLE_SQL = `create table if not exists public.portal_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.portal_settings to service_role;
alter table public.portal_settings enable row level security;`;
