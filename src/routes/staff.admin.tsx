import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePortalSession } from "@/hooks/use-portal-session";
import {
  getPortalSettings,
  listStaff,
  savePortalSettings,
  saveStaffMember,
  setStaffStatus,
} from "@/lib/portal.functions";
import { DEFAULT_SETTINGS, SETTINGS_TABLE_SQL, STAFF_ROLES } from "@/lib/settings";
import type { AcademicSettings, PortalToggles, SchoolSettings } from "@/lib/settings";

export const Route = createFileRoute("/staff/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Joba International Academy Portal" },
      {
        name: "description",
        content:
          "Manage school details, academic session, staff accounts, roles and portal settings without code changes.",
      },
      { property: "og:title", content: "Administration — Joba International Academy Portal" },
      {
        property: "og:description",
        content: "School details, staff roles and portal settings in one console.",
      },
    ],
  }),
  component: AdminPage,
});

const TABS = ["School details", "Academic session", "Staff & roles", "Portal settings"] as const;

function AdminPage() {
  const { data: user } = usePortalSession();
  const role = (user?.staffRole ?? "").toLowerCase();
  const isAdmin = role === "admin" || role === "principal";
  const [tab, setTab] = useState<(typeof TABS)[number]>("School details");

  const settingsQuery = useQuery({
    queryKey: ["portal-settings"],
    queryFn: () => getPortalSettings(),
  });
  const staffQuery = useQuery({ queryKey: ["staff-users"], queryFn: () => listStaff() });

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="font-display text-2xl font-bold">Administration</h1>
        <p className="mt-2 text-muted-foreground">
          This console is restricted to administrators and the principal.
        </p>
      </div>
    );
  }

  const settings = settingsQuery.data?.settings ?? DEFAULT_SETTINGS;
  const ready = settingsQuery.data?.ready ?? true;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Administration</h1>
        <p className="text-muted-foreground">
          Update school information, academic session, staff accounts and portal behaviour.
        </p>
      </div>

      {!ready ? <SetupCard message={settingsQuery.data?.error ?? ""} /> : null}

      <div className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px rounded-t px-4 py-2 text-sm transition-colors ${
              tab === t
                ? "border-b-2 border-primary font-semibold text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "School details" ? (
        <SchoolForm
          value={settings.school}
          disabled={!ready}
          onSaved={() => void settingsQuery.refetch()}
        />
      ) : null}
      {tab === "Academic session" ? (
        <AcademicForm
          value={settings.academic}
          disabled={!ready}
          onSaved={() => void settingsQuery.refetch()}
        />
      ) : null}
      {tab === "Portal settings" ? (
        <PortalForm
          value={settings.portal}
          disabled={!ready}
          onSaved={() => void settingsQuery.refetch()}
        />
      ) : null}
      {tab === "Staff & roles" ? (
        <StaffManager
          staff={staffQuery.data ?? []}
          classLevels={settings.academic.classLevels}
          onChanged={() => void staffQuery.refetch()}
        />
      ) : null}
    </div>
  );
}

function SetupCard({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-accent bg-accent/10 p-5">
      <p className="font-semibold text-foreground">One-time database setup required</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Settings are stored in a <code>portal_settings</code> table which does not exist yet
        {message ? ` (${message})` : ""}. Paste the SQL below into your Supabase SQL editor and run
        it once, then reload this page. Staff management below works already.
      </p>
      <pre className="mt-3 overflow-x-auto rounded bg-secondary p-3 text-xs">
        {SETTINGS_TABLE_SQL}
      </pre>
      <Button
        className="mt-3"
        variant="secondary"
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(SETTINGS_TABLE_SQL);
          toast.success("SQL copied to clipboard.");
        }}
      >
        Copy SQL
      </Button>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} />
    </div>
  );
}

function useSaver(key: "school" | "academic" | "portal", onSaved: () => void) {
  const [busy, setBusy] = useState(false);
  async function save(value: Record<string, unknown>) {
    setBusy(true);
    const res = await savePortalSettings({ data: { key, value } });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Saved. Changes are live across the portal.");
    onSaved();
  }
  return { busy, save };
}

function SchoolForm({
  value,
  disabled,
  onSaved,
}: {
  value: SchoolSettings;
  disabled: boolean;
  onSaved: () => void;
}) {
  const { busy, save } = useSaver("school", onSaved);
  return (
    <form
      className="grid max-w-3xl gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        void save({
          name: String(fd.get("name")),
          shortName: String(fd.get("shortName")),
          motto: String(fd.get("motto")),
          address: String(fd.get("address")),
          phone: String(fd.get("phone")),
          email: String(fd.get("email")),
          website: String(fd.get("website")),
          logoUrl: String(fd.get("logoUrl")),
          principalName: String(fd.get("principalName")),
        });
      }}
    >
      <Field label="School name" name="name" defaultValue={value.name} />
      <Field label="Short name" name="shortName" defaultValue={value.shortName} />
      <div className="md:col-span-2">
        <Field label="Motto" name="motto" defaultValue={value.motto} />
      </div>
      <div className="md:col-span-2 space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" name="address" rows={2} defaultValue={value.address} />
      </div>
      <Field label="Phone" name="phone" defaultValue={value.phone} />
      <Field label="Email" name="email" type="email" defaultValue={value.email} />
      <Field label="Website" name="website" defaultValue={value.website} />
      <Field label="Principal / Head" name="principalName" defaultValue={value.principalName} />
      <div className="md:col-span-2">
        <Field label="Logo URL (optional)" name="logoUrl" defaultValue={value.logoUrl} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={busy || disabled}>
          {busy ? "Saving…" : "Save school details"}
        </Button>
      </div>
    </form>
  );
}

function AcademicForm({
  value,
  disabled,
  onSaved,
}: {
  value: AcademicSettings;
  disabled: boolean;
  onSaved: () => void;
}) {
  const { busy, save } = useSaver("academic", onSaved);
  return (
    <form
      className="grid max-w-3xl gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        void save({
          session: String(fd.get("session")),
          term: String(fd.get("term")),
          resumptionDate: String(fd.get("resumptionDate")),
          gradingScale: String(fd.get("gradingScale")),
          classLevels: String(fd.get("classLevels"))
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        });
      }}
    >
      <Field label="Current session" name="session" defaultValue={value.session} />
      <div className="space-y-1.5">
        <Label htmlFor="term">Current term</Label>
        <select
          id="term"
          name="term"
          defaultValue={value.term}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option>1st Term</option>
          <option>2nd Term</option>
          <option>3rd Term</option>
        </select>
      </div>
      <Field
        label="Next resumption date"
        name="resumptionDate"
        defaultValue={value.resumptionDate}
      />
      <Field label="Grading scale" name="gradingScale" defaultValue={value.gradingScale} />
      <div className="md:col-span-2 space-y-1.5">
        <Label htmlFor="classLevels">Class levels (comma separated)</Label>
        <Textarea
          id="classLevels"
          name="classLevels"
          rows={2}
          defaultValue={value.classLevels.join(", ")}
        />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={busy || disabled}>
          {busy ? "Saving…" : "Save academic session"}
        </Button>
      </div>
    </form>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded border border-border bg-background px-3 py-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" />
      {label}
    </label>
  );
}

function PortalForm({
  value,
  disabled,
  onSaved,
}: {
  value: PortalToggles;
  disabled: boolean;
  onSaved: () => void;
}) {
  const { busy, save } = useSaver("portal", onSaved);
  return (
    <form
      className="grid max-w-3xl gap-4 rounded-lg border border-border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        void save({
          admissionsOpen: fd.get("admissionsOpen") === "on",
          careersOpen: fd.get("careersOpen") === "on",
          coachingOpen: fd.get("coachingOpen") === "on",
          resultsPublished: fd.get("resultsPublished") === "on",
          announcement: String(fd.get("announcement")),
          defaultStudentPassword: String(fd.get("defaultStudentPassword")),
        });
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Toggle name="admissionsOpen" label="Admissions open" defaultChecked={value.admissionsOpen} />
        <Toggle name="careersOpen" label="Career applications open" defaultChecked={value.careersOpen} />
        <Toggle name="coachingOpen" label="Holiday coaching open" defaultChecked={value.coachingOpen} />
        <Toggle
          name="resultsPublished"
          label="Results visible to students"
          defaultChecked={value.resultsPublished}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="announcement">Site-wide announcement banner</Label>
        <Textarea
          id="announcement"
          name="announcement"
          rows={2}
          defaultValue={value.announcement}
          placeholder="Leave empty to hide the banner"
        />
      </div>
      <Field
        label="Default password for new student accounts"
        name="defaultStudentPassword"
        defaultValue={value.defaultStudentPassword}
      />
      <div>
        <Button type="submit" disabled={busy || disabled}>
          {busy ? "Saving…" : "Save portal settings"}
        </Button>
      </div>
    </form>
  );
}

type StaffRow = Record<string, unknown>;

function StaffManager({
  staff,
  classLevels,
  onChanged,
}: {
  staff: StaffRow[];
  classLevels: string[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [busy, setBusy] = useState(false);
  const creating = editing !== null && !editing["id"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => setEditing({})}>
          Add staff member
        </Button>
        <p className="text-sm text-muted-foreground">{staff.length} staff accounts</p>
      </div>

      {editing ? (
        <form
          className="grid max-w-3xl gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setBusy(true);
            const res = await saveStaffMember({
              data: {
                ...(editing["id"] ? { id: String(editing["id"]) } : {}),
                staffId: String(fd.get("staff_id")),
                fullName: String(fd.get("full_name")),
                email: String(fd.get("email")),
                phone: String(fd.get("phone")),
                role: String(fd.get("role")),
                department: String(fd.get("department")),
                assignedClasses: fd.getAll("classes").map(String),
                status: String(fd.get("status")),
                password: String(fd.get("password") ?? ""),
              },
            });
            setBusy(false);
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success(creating ? "Staff account created." : "Staff account updated.");
            setEditing(null);
            onChanged();
          }}
        >
          <p className="md:col-span-2 font-display text-lg font-semibold">
            {creating ? "New staff member" : `Edit ${String(editing["full_name"] ?? "")}`}
          </p>
          <Field label="Staff ID" name="staff_id" defaultValue={String(editing["staff_id"] ?? "")} />
          <Field
            label="Full name"
            name="full_name"
            defaultValue={String(editing["full_name"] ?? "")}
          />
          <Field label="Email" name="email" type="email" defaultValue={String(editing["email"] ?? "")} />
          <Field label="Phone" name="phone" defaultValue={String(editing["phone"] ?? "")} />
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              name="role"
              defaultValue={String(editing["role"] ?? "teacher")}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={String(editing["status"] ?? "Active")}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Field
              label="Department"
              name="department"
              defaultValue={String(editing["department"] ?? "")}
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Assigned classes</Label>
            <div className="flex flex-wrap gap-2">
              {classLevels.map((c) => {
                const current = (editing["assigned_classes"] as string[] | null) ?? [];
                return (
                  <label
                    key={c}
                    className="flex items-center gap-2 rounded border border-border px-2 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="classes"
                      value={c}
                      defaultChecked={current.includes(c)}
                    />
                    {c}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-2">
            <Field
              label={creating ? "Portal password" : "New password (leave blank to keep current)"}
              name="password"
            />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : creating ? "Create staff account" : "Save changes"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              <th className="px-3 py-2">Staff ID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Department</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={String(s["id"])} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{String(s["staff_id"] ?? "")}</td>
                <td className="px-3 py-2">
                  <p className="font-medium">{String(s["full_name"] ?? "")}</p>
                  <p className="text-xs text-muted-foreground">{String(s["email"] ?? "")}</p>
                </td>
                <td className="px-3 py-2 capitalize">{String(s["role"] ?? "").replace("_", " ")}</td>
                <td className="px-3 py-2">{String(s["department"] ?? "")}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      s["status"] === "Active"
                        ? "rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
                        : "rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
                    }
                  >
                    {String(s["status"] ?? "")}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(s)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const next = s["status"] === "Active" ? "Inactive" : "Active";
                        const res = await setStaffStatus({
                          data: { id: String(s["id"]), status: next },
                        });
                        if (!res.ok) {
                          toast.error(res.error);
                          return;
                        }
                        toast.success(`Account marked ${next.toLowerCase()}.`);
                        onChanged();
                      }}
                    >
                      {s["status"] === "Active" ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
