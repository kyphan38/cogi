"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { usePresence } from "@/lib/hooks/usePresence";
import { cn } from "@/lib/utils";

/** Matches `.toast-cogi.is-leaving` in globals.css. */
const EXIT_MS = 200;

export type ToastType = "success" | "error" | "info";

type ToastEntry = { id: number; message: string; type: ToastType };

const ToastContext = createContext<
  ((message: string, type?: ToastType) => void) | null
>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastEntry | null>(null);
  const seq = useRef(0);
  // The last toast stays on screen for the exit animation. Derived during
  // render, so it never blinks out for one frame.
  const [last, setLast] = useState<ToastEntry | null>(null);
  if (toast && toast !== last) setLast(toast);
  const { mounted, leaving } = usePresence(toast !== null, EXIT_MS);
  const shown = toast ?? last;

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    setToast({ id: ++seq.current, message, type });
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(dismiss, 3200);
    return () => window.clearTimeout(id);
  }, [toast, dismiss]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {mounted && shown ? (
        <div
          // A new id is a new toast: its own entry animation.
          key={shown.id}
          className={cn(
            "toast-cogi pointer-events-auto flex max-w-[min(360px,calc(100vw-2rem))] items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white",
            shown.type === "success" && "toast-cogi-success",
            shown.type === "error" && "toast-cogi-error",
            shown.type === "info" && "toast-cogi-info",
            leaving && "is-leaving",
          )}
          role="status"
          aria-hidden={leaving || undefined}
        >
          <span aria-hidden className="shrink-0 text-base leading-none opacity-90">
            {shown.type === "success" ? "✓" : shown.type === "error" ? "✕" : "ℹ"}
          </span>
          <span className="min-w-0 flex-1">{shown.message}</span>
          <button
            type="button"
            className="shrink-0 rounded-md p-1 opacity-80 hover:opacity-100"
            disabled={leaving}
            onClick={dismiss}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

/** Fire-and-forget toasts; no-op if used outside {@link ToastProvider}. */
export function useToast() {
  const ctx = useContext(ToastContext);
  return useMemo(
    () => ({
      show: (message: string, type: ToastType = "info") => {
        ctx?.(message, type);
      },
    }),
    [ctx],
  );
}
