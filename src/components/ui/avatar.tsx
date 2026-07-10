import { avatar } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type AvatarProps = {
  userKey: string;
  size?: number;
  fontSize?: number;
  className?: string;
  style?: React.CSSProperties;
};

/** Circular initials avatar colored from the shared AVATARS map. */
export function Avatar({
  userKey,
  size = 30,
  fontSize = 11.5,
  className,
  style,
}: AvatarProps) {
  const [bg, fg, initials] = avatar(userKey);
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
