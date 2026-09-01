import { useQuery } from "@tanstack/react-query";

import { getSession, type SessionUser } from "@/lib/auth.functions";

export function usePortalSession() {
  return useQuery<SessionUser | null>({
    queryKey: ["portal-session"],
    queryFn: () => getSession(),
    staleTime: 60_000,
  });
}
