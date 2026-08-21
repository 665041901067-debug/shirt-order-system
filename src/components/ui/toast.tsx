"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    // Clear timer if exists
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "success") => {
      if (!message || message.trim() === "") return;

      const trimmed = message.trim();

      // Check if duplicate toast exists to prevent flickering spam
      setToasts((prev) => {
        const existing = prev.find((t) => t.message === trimmed);
        if (existing) {
          // Reset its timer
          if (timersRef.current.has(existing.id)) {
            clearTimeout(timersRef.current.get(existing.id));
          }
          const newTimer = setTimeout(() => {
            removeToast(existing.id);
          }, 3500);
          timersRef.current.set(existing.id, newTimer);
          return prev;
        }

        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const timer = setTimeout(() => {
          removeToast(id);
        }, 3500);
        timersRef.current.set(id, timer);

        // Keep maximum 3 toasts visible at a time
        return [...prev.slice(-2), { id, message: trimmed, type }];
      });
    },
    [removeToast]
  );

  const value = {
    toast: addToast,
    success: (msg: string) => addToast(msg, "success"),
    error: (msg: string) => addToast(msg, "error"),
    info: (msg: string) => addToast(msg, "info"),
    warning: (msg: string) => addToast(msg, "warning"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Floating Toast Portal - Ultra-smooth & Non-flickering */}
      <div className="fixed top-5 inset-x-0 z-[9999] flex flex-col items-center gap-2 pointer-events-none px-4 max-w-lg mx-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-full max-w-md p-3.5 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 text-xs font-semibold backdrop-blur-md transition-all duration-300 transform-gpu animate-in slide-in-from-top-3 fade-in ${
              t.type === "success"
                ? "bg-slate-900/95 text-white border-emerald-500/50 ring-1 ring-emerald-500/30"
                : t.type === "error"
                ? "bg-slate-900/95 text-white border-red-500/50 ring-1 ring-red-500/30"
                : t.type === "warning"
                ? "bg-slate-900/95 text-white border-amber-500/50 ring-1 ring-amber-500/30"
                : "bg-slate-900/95 text-white border-blue-500/50 ring-1 ring-blue-500/30"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
              {t.type === "error" && <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />}
              {t.type === "warning" && <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />}
              {t.type === "info" && <Info className="h-4 w-4 text-blue-400 shrink-0" />}
              <span className="leading-snug truncate">{t.message}</span>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0 transition-colors"
              aria-label="ปิดการแจ้งเตือน"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast: (msg: string) => {},
      success: (msg: string) => {},
      error: (msg: string) => {},
      info: (msg: string) => {},
      warning: (msg: string) => {},
    };
  }
  return context;
}
