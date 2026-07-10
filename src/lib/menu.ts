import { NAV_ITEMS } from "./mock-data";

/** Saved menu customization item (display only — never affects permissions). */
export type MenuConfigItem = {
  key: string;
  customLabel?: string | null;
  order: number;
  isVisible: boolean;
};

export type ResolvedMenuItem = {
  key: string;
  label: string;
  defaultLabel: string;
  href: string;
  iconKey: string;
  order: number;
  isVisible: boolean;
  isLocked: boolean;
};

/** Critical menus that may be renamed/reordered but never hidden. */
const LOCKED_KEYS = new Set(["dashboard", "settings"]);

export const MENU_DEFS = NAV_ITEMS.map((n, i) => ({
  key: n.id,
  defaultLabel: n.label,
  href: n.href,
  iconKey: n.icon,
  isLocked: LOCKED_KEYS.has(n.id),
  defaultOrder: i,
}));

const KNOWN_KEYS = new Set(MENU_DEFS.map((d) => d.key));

/**
 * Merge saved config with code defaults into an ordered, resolved menu.
 * Unknown keys in config are ignored; new menus not yet in config keep their
 * code order/label/visibility. Locked menus are always visible.
 */
export function resolveMenu(config: MenuConfigItem[] | null | undefined): ResolvedMenuItem[] {
  const byKey = new Map(
    (config ?? []).filter((c) => c && KNOWN_KEYS.has(c.key)).map((c) => [c.key, c])
  );
  return MENU_DEFS.map((d) => {
    const c = byKey.get(d.key);
    const custom = c?.customLabel?.trim();
    return {
      key: d.key,
      label: custom || d.defaultLabel,
      defaultLabel: d.defaultLabel,
      href: d.href,
      iconKey: d.iconKey,
      order: typeof c?.order === "number" ? c.order : d.defaultOrder,
      isVisible: d.isLocked ? true : c?.isVisible ?? true,
      isLocked: d.isLocked,
    };
  }).sort((a, b) => a.order - b.order || a.defaultLabel.localeCompare(b.defaultLabel));
}

/** Event name the settings page fires after saving so the sidebar can refresh live. */
export const MENU_UPDATED_EVENT = "devpulse:menu-updated";
