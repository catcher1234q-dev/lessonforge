"use client";

import { useEffect, useState } from "react";
import { Crown, Shield, ShoppingBag, Store } from "lucide-react";

import { syncViewerCookie } from "@/lib/auth/viewer-sync";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import type { Viewer, ViewerRole } from "@/types";

const roleMeta: Record<
  ViewerRole,
  { label: string; shortLabel: string; icon: typeof ShoppingBag }
> = {
  buyer: {
    label: "Buyer view",
    shortLabel: "Buyer",
    icon: ShoppingBag,
  },
  seller: {
    label: "Seller view",
    shortLabel: "Seller",
    icon: Store,
  },
  admin: {
    label: "Admin view",
    shortLabel: "Admin",
    icon: Shield,
  },
  owner: {
    label: "Owner view",
    shortLabel: "Owner",
    icon: Crown,
  },
};

export function ViewerRoleControls() {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [allowedRoles, setAllowedRoles] = useState<ViewerRole[]>(["buyer", "seller"]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/session/viewer");
      const payload = (await response.json()) as { viewer?: Viewer; allowedRoles?: ViewerRole[] };

      if (response.ok && payload.viewer) {
        setViewer(payload.viewer);
        setAllowedRoles(payload.allowedRoles?.length ? payload.allowedRoles : ["buyer", "seller"]);
      }
    })();
  }, []);

  async function switchRole(role: ViewerRole) {
    setIsUpdating(true);

    try {
      const session = hasSupabaseEnv()
        ? (await getSupabaseBrowserClient().auth.getSession()).data.session
        : null;
      const nextViewer = await syncViewerCookie({ role, session });

      if (nextViewer) {
        setViewer(nextViewer);
        window.location.reload();
      }
    } finally {
      setIsUpdating(false);
    }
  }

  if (!viewer) {
    return (
      <div className="rounded-full bg-surface-muted px-4 py-2 text-sm text-ink-soft">
        Loading viewer role...
      </div>
    );
  }

  const ActiveIcon = roleMeta[viewer.role].icon;

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-2 text-sm text-ink-soft 2xl:flex">
        <ActiveIcon className="h-4 w-4 text-brand" />
        <span>{roleMeta[viewer.role].label}</span>
      </div>
      <div className="flex items-center rounded-full border border-ink/10 bg-white p-1 shadow-sm">
        {allowedRoles.map((role) => (
          <button
            key={role}
            className={`rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
              viewer.role === role
                ? "bg-brand text-white"
                : "text-ink-soft hover:bg-surface-muted"
            }`}
            disabled={isUpdating}
            onClick={() => void switchRole(role)}
            type="button"
          >
            {roleMeta[role].shortLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
