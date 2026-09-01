import { redirect } from "@tanstack/react-router";

import { getSession } from "@/lib/auth.functions";
import { can, type Capability } from "@/lib/permissions";

/** Route guard: staff must hold the capability, otherwise bounce to the dashboard. */
export async function requireCapability(capability: Capability) {
  const user = await getSession();
  if (!user) throw redirect({ to: "/login" });
  if (user.role === "student") throw redirect({ to: "/student" });
  if (!can(user.staffRole ?? "", capability)) throw redirect({ to: "/staff" });
  return user;
}
