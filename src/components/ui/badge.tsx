import * as React from "react";
import { cn } from "./button";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 
    | "default" 
    | "primary" 
    | "secondary" 
    | "outline" 
    | "success" 
    | "warning" 
    | "danger" 
    | "info";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  ...props
}: BadgeProps) {
  const base = "inline-flex items-center font-medium rounded-full transition-colors";
  
  const variants = {
    default: "bg-slate-100 text-slate-800 border border-slate-200",
    primary: "bg-blue-600 text-white shadow-xs",
    secondary: "bg-[#EFF6FF] text-[#1E3A8A] border border-blue-200",
    outline: "border border-slate-300 text-slate-700 bg-white",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    danger: "bg-rose-50 text-rose-700 border border-rose-200",
    info: "bg-sky-50 text-sky-700 border border-sky-200",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <div className={cn(base, variants[variant], sizes[size], className)} {...props} />
  );
}
