"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { reducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Matches `.cogi-modal-*.is-leaving` in globals.css. */
const EXIT_MS = 200;

/**
 * Backdrop and centered panel for a modal. Closing by the backdrop or Esc plays
 * the exit first, then calls `onClose`. Buttons inside call their own handlers
 * and the modal goes at once: what follows (a toast, a changed list) is the
 * feedback, so nobody waits on an animation.
 */
export function ModalShell({
  onClose,
  labelledBy,
  panelClassName,
  children,
}: {
  onClose: () => void;
  labelledBy?: string;
  /** Width, padding, border and background of the panel. */
  panelClassName?: string;
  children: ReactNode;
}) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestClose = useRef(onClose);

  useEffect(() => {
    latestClose.current = onClose;
  }, [onClose]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const close = useCallback(() => {
    if (leaving) return;
    if (reducedMotion()) {
      latestClose.current();
      return;
    }
    setLeaving(true);
    timer.current = setTimeout(() => latestClose.current(), EXIT_MS);
  }, [leaving]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div
      className={cn(
        "cogi-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm",
        leaving && "is-leaving pointer-events-none",
      )}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "cogi-modal-panel w-full max-w-md rounded-2xl border border-border bg-card p-5",
          panelClassName,
          leaving && "is-leaving",
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
