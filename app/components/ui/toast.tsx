"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/app/lib/cn";

// Toast/notificatiesysteem (audit-bevinding DS-01: "geen toast-systeem,
// nul dekking") — bedoeld voor korte, niet-blokkerende bevestigingen
// ("Verwijderd", "Rekentool gepubliceerd", "Opslaan mislukt"). Formulier-
// validatie met veldspecifieke fouten blijft inline (dat hoort niet in een
// toast); dit is voor gebeurtenissen die niet aan één zichtbaar veld
// hangen. Zelfde portal-naar-document.body-mechaniek als Overlay
// (app/components/ui/overlay.tsx), maar zonder Escape/scroll-lock — een
// toast onderbreekt de gebruiker bewust niet.
type ToastVariant = "success" | "error" | "info";
type ToastItem = { id: string; variant: ToastVariant; message: string };

const DUUR_MS = 4000;

const VARIANT_CONFIG: Record<ToastVariant, { icon: typeof CheckCircle2; className: string; role: "status" | "alert" }> = {
  success: { icon: CheckCircle2, className: "border-primary/30 bg-card text-foreground [&_svg]:text-primary", role: "status" },
  error: { icon: XCircle, className: "border-destructive/30 bg-card text-foreground [&_svg]:text-destructive", role: "alert" },
  info: { icon: Info, className: "border-border bg-card text-foreground [&_svg]:text-muted-foreground", role: "status" },
};

const ToastContext = createContext<{ toast: (message: string, variant?: ToastVariant) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast() moet binnen een <ToastProvider> gebruikt worden.");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const start = useCallback(
    (id: string) => {
      const timer = setTimeout(() => dismiss(id), DUUR_MS);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  const pause = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setItems((prev) => [...prev, { id, variant, message }]);
      start(id);
    },
    [start]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {items.length > 0 &&
        createPortal(
          <div
            className="fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4 sm:right-4 sm:left-auto sm:items-end"
            aria-label="Meldingen"
          >
            {items.map((item) => {
              const config = VARIANT_CONFIG[item.variant];
              const Icon = config.icon;
              return (
                <div
                  key={item.id}
                  role={config.role}
                  onMouseEnter={() => pause(item.id)}
                  onMouseLeave={() => start(item.id)}
                  className={cn(
                    "flex w-full max-w-sm items-start gap-2.5 rounded-lg border px-4 py-3 text-sm shadow-lg",
                    config.className
                  )}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="flex-1">{item.message}</p>
                  <button
                    type="button"
                    onClick={() => dismiss(item.id)}
                    aria-label="Melding sluiten"
                    className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
