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
    const { getDb, getPortalSession, passwordMatches, isLegacyHash, hashPassword, sanitizeFilterValue } =
      await import("./portal.server");
    const db = getDb();
    const id = sanitizeFilterValue(data.identifier);
    if (!id || !data.password) return { ok: false as const, error: "Enter your ID and password." };
    const { data: rows } = await db
      .from("student_profiles")
      .select("*")
      .or(`admission_id.eq.${id},student_email.eq.${id.toLowerCase()}`)
      .limit(1);
    const profile = rows?.[0];
    if (!profile) return { ok: false as const, error: "No student found with those details." };

    const storedStudentHash = profile["portal_password_hash"] ?? profile["password_hash"];
    const ok = await passwordMatches(data.password, storedStudentHash);
    if (!ok) return { ok: false as const, error: "Incorrect password." };

    // Silently upgrade legacy plain/sha256 values to a salted PBKDF2 hash.
    if (isLegacyHash(storedStudentHash)) {
      await db
        .from("student_profiles")
        .update({ portal_password_hash: await hashPassword(data.password) })
        .eq("admission_id", profile["admission_id"]);
    }

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
    const { getDb, getPortalSession, passwordMatches, isLegacyHash, hashPassword, sanitizeFilterValue } =
      await import("./portal.server");
    const db = getDb();
    const id = sanitizeFilterValue(data.identifier);
    if (!id || !data.password) return { ok: false as const, error: "Enter your ID and password." };
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

    if (isLegacyHash(staff["password_hash"])) {
      await db
        .from("staff_users")
        .update({ password_hash: await hashPassword(data.password) })
        .eq("id", staff["id"]);
    }

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

export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((d: { currentPassword: string; newPassword: string }) => d)
  .handler(async ({ data }) => {
    const { getDb, currentUser, passwordMatches, hashPassword } = await import("./portal.server");
    const user = await currentUser();
    if (!user?.role || !user.id) return { ok: false as const, error: "You are not signed in." };
    if (data.newPassword.trim().length < 8) {
      return { ok: false as const, error: "New password must be at least 8 characters." };
    }
    const db = getDb();

    if (user.role === "student") {
      const { data: profile } = await db
        .from("student_profiles")
        .select("admission_id, portal_password_hash")
        .eq("admission_id", user.id)
        .maybeSingle();
      if (!profile) return { ok: false as const, error: "Account not found." };
      if (!(await passwordMatches(data.currentPassword, profile["portal_password_hash"]))) {
        return { ok: false as const, error: "Current password is incorrect." };
      }
      const { error } = await db
        .from("student_profiles")
        .update({ portal_password_hash: await hashPassword(data.newPassword) })
        .eq("admission_id", user.id);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const };
    }

    const { data: staff } = await db
      .from("staff_users")
      .select("id, password_hash, status")
      .eq("staff_id", user.id)
      .maybeSingle();
    if (!staff) return { ok: false as const, error: "Account not found." };
    if (staff["status"] !== "Active") return { ok: false as const, error: "Account is inactive." };
    if (!(await passwordMatches(data.currentPassword, staff["password_hash"]))) {
      return { ok: false as const, error: "Current password is incorrect." };
    }
    const { error } = await db
      .from("staff_users")
      .update({ password_hash: await hashPassword(data.newPassword) })
      .eq("id", staff["id"]);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
