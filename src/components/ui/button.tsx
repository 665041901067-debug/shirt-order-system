import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl active:scale-[0.98]";
    
    const variants = {
      primary: "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm shadow-blue-500/20",
      secondary: "bg-[#EFF6FF] text-[#1E3A8A] hover:bg-blue-100 font-semibold",
      outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-xs",
      ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-500/20",
      link: "text-[#2563EB] underline-offset-4 hover:underline p-0 h-auto font-normal",
    };

    const sizes = {
      sm: "h-9 px-3 text-xs gap-1.5",
      md: "h-11 px-4 text-sm gap-2",
      lg: "h-12 px-6 text-base gap-2.5",
      icon: "h-10 w-10 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>กำลังโหลด...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
