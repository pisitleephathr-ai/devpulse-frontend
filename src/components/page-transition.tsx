"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Gentle page-content entrance on route change (fade + slight rise).
 * Keyed by pathname so it replays on navigation. Honors prefers-reduced-motion.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  // h-full keeps the flex/height chain intact so pages that fit the viewport
  // (board, calendar) can size against <main> instead of growing the page.
  if (reduce) return <div className="h-full">{children}</div>;

  return (
    <motion.div
      key={pathname}
      className="h-full"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
