"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
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

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 3500);
  }, [removeToast]);

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

      {/* Floating Toast Portal */}
      <div className="fixed top-4 inset-x-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-sm w-full p-3.5 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-xs font-semibold backdrop-blur-md animate-in slide-in-from-top-3 fade-in duration-200 transition-all ${
              t.type === "success"
                ? "bg-slate-900/95 text-white border-emerald-500/40 ring-1 ring-emerald-500/20"
                : t.type === "error"
                ? "bg-slate-900/95 text-white border-red-500/40 ring-1 ring-red-500/20"
                : t.type === "warning"
                ? "bg-slate-900/95 text-white border-amber-500/40 ring-1 ring-amber-500/20"
                : "bg-slate-900/95 text-white border-blue-500/40 ring-1 ring-blue-500/20"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {t.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
              {t.type === "error" && <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />}
              {t.type === "warning" && <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />}
              {t.type === "info" && <Info className="h-4 w-4 text-blue-400 shrink-0" />}
              <span className="leading-snug">{t.message}</span>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded-lg"
            >
              <X className="h-3.5 w-3.5" />
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
    // Fallback if rendered outside provider
    return {
      toast: (msg: string) => console.log(msg),
      success: (msg: string) => console.log(msg),
      error: (msg: string) => console.log(msg),
      info: (msg: string) => console.log(msg),
      warning: (msg: string) => console.log(msg),
    };
  }
  return context;
}
