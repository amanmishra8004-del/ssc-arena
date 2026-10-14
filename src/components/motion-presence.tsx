import { useEffect, useState, type ReactNode } from "react";

/** Keep overlays mounted briefly so their close animation can finish. */
export function MotionPresence({ open, children }: { open: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) { setMounted(true); return; }
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180;
    const timer = window.setTimeout(() => setMounted(false), delay);
    return () => window.clearTimeout(timer);
  }, [open]);
  if (!open && !mounted) return null;
  return <div className="motion-presence" data-state={open ? "open" : "closed"} inert={!open}>{children}</div>;
}