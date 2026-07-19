import { avatar } from "@/lib/mock-data";
import { useDisplayNameByKey } from "@/lib/store";
import { cn } from "@/lib/utils";

type AvatarProps = {
  userKey: string;
  /** Explicit display name; when omitted it's resolved from the store by key.
   *  Initials come from this name (not the email-based avatar key). */
  name?: string;
  size?: number;
  fontSize?: number;
  className?: string;
  style?: React.CSSProperties;
};

/** Initials from a display name: first letters of the first two words, or the
 *  first two characters of a single word. Works for Thai and Latin names. */
function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

/**
 * Circular initials avatar. Color is derived from the stable avatar key (so a
 * person keeps a consistent color), but the initials follow the display NAME —
 * resolved from the store when a `name` isn't passed explicitly.
 */
export function Avatar({
  userKey,
  name,
  size = 30,
  fontSize = 11.5,
  className,
  style,
}: AvatarProps) {
  const lookupName = useDisplayNameByKey();
  const [bg, fg, keyInitials] = avatar(userKey);
  const displayName = name ?? lookupName(userKey);
  const initials = displayName ? initialsFromName(displayName) : keyInitials;
  return (
    <div
      className={cn(
        "flex flex-none items-center justify-center rounded-full font-semibold",
        className
      )}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize,
        ...style,
      }}
    >
      {initials}
    </div>
  );
}
