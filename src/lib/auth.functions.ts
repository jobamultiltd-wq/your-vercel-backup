import { createServerFn } from "@tanstack/react-start";

export type SessionUser = {
  role: "student" | "staff";
  id: string;
  name: string;
  email: string;
  staffRole?: string | undefined;
  classLevel?: string | undefined;
};

export const getSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionUser | null> => {
    const { currentUser } = await import("./portal.server");
    const user = await currentUser();
    if (!user?.role || !user.id) return null;
    return {
      role: user.role,
      id: user.id,
      name: user.name ?? "",
      email: user.email ?? "",
      staffRole: user.staffRole,
      classLevel: user.classLevel,
    };
  },
);

export const loginStudent = createServerFn({ method: "POST" })
  .inputValidator((d: { identifier: string; password: string }) => d)
  .handler(async ({ data }) => {
    const { getDb, getPortalSession, passwordMatches } = await import("./portal.server");
    const db = getDb();
    const id = data.identifier.trim();
    const { data: rows } = await db
      .from("student_profiles")
      .select("*")
      .or(`admission_id.eq.${id},student_email.eq.${id.toLowerCase()}`)
      .limit(1);
    const profile = rows?.[0];
    if (!profile) return { ok: false as const, error: "No student found with those details." };

    const ok = await passwordMatches(
      data.password,
      profile["portal_password_hash"] ?? profile["password_hash"],
    );
    if (!ok) return { ok: false as const, error: "Incorrect password." };

    const session = await getPortalSession();
    await session.update({
      role: "student",
      id: profile["admission_id"],
      name: `${profile["first_name"]} ${profile["last_name"]}`,
      email: profile["student_email"],
      classLevel: profile["class_level"],
    });
    return { ok: true as const };
  });

export const loginStaff = createServerFn({ method: "POST" })
  .inputValidator((d: { identifier: string; password: string }) => d)
  .handler(async ({ data }) => {
    const { getDb, getPortalSession, passwordMatches } = await import("./portal.server");
    const db = getDb();
    const id = data.identifier.trim();
    const { data: rows } = await db
      .from("staff_users")
      .select("*")
      .or(`staff_id.eq.${id},email.eq.${id.toLowerCase()}`)
      .limit(1);
    const staff = rows?.[0];
    if (!staff) return { ok: false as const, error: "No staff account found." };
    if (staff["status"] !== "Active") return { ok: false as const, error: "Account is inactive." };

    const ok = await passwordMatches(data.password, staff["password_hash"]);
    if (!ok) return { ok: false as const, error: "Incorrect password." };

    const session = await getPortalSession();
    await session.update({
      role: "staff",
      id: staff["staff_id"],
      name: staff["full_name"],
      email: staff["email"],
      staffRole: staff["role"],
    });
    return { ok: true as const };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { getPortalSession } = await import("./portal.server");
  const session = await getPortalSession();
  await session.clear();
  return { ok: true as const };
});
