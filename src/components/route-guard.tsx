"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getStoredUser } from "@/lib/auth";
import { canAccessRoute } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";

/**
 * Client-side route guard: blocks pages the current user's role can't access
 * (e.g. DEVELOPER → /users or /settings/roles) with a 403 page. The backend
 * enforces the same rules on the API, so this is UX-only.
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<{ checked: boolean; allowed: boolean }>({
    checked: false,
    allowed: true,
  });

  useEffect(() => {
    const user = getStoredUser();
    // Read the external store (localStorage) after mount, then decide access.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ checked: true, allowed: canAccessRoute(user, pathname) });
  }, [pathname]);

  if (!state.checked) return null;
  if (!state.allowed) return <AccessDenied />;
  return <>{children}</>;
}
