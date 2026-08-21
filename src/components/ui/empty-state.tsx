import * as React from "react";
import { LucideIcon, PackageOpen } from "lucide-react";
import { cn } from "./button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-white/60 backdrop-blur-xs my-4", className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-[#2563EB] mb-4 shadow-inner">
        <Icon className="h-8 w-8 stroke-[1.5]" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-slate-500 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
