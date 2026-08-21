import React from "react";

export default function StudentLoading() {
  return (
    <div className="min-h-[80vh] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <div className="h-8 w-48 bg-slate-200 rounded-xl" />
        <div className="h-4 w-72 bg-slate-100 rounded-lg" />
      </div>

      {/* Hero / Banner Skeleton */}
      <div className="h-48 sm:h-64 w-full bg-slate-200/70 rounded-3xl" />

      {/* Grid Items Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-3xl border border-slate-200 p-4 space-y-4 shadow-2xs">
            <div className="aspect-square w-full bg-slate-100 rounded-2xl" />
            <div className="space-y-2">
              <div className="h-5 w-3/4 bg-slate-200 rounded-md" />
              <div className="h-4 w-1/2 bg-slate-100 rounded-md" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="h-6 w-20 bg-slate-200 rounded-lg" />
              <div className="h-9 w-24 bg-blue-100 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
