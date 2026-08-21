import React from "react";

export default function AdminLoading() {
  return (
    <div className="min-h-[80vh] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
      {/* Top Header Bar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-slate-200 rounded-xl" />
          <div className="h-4 w-40 bg-slate-100 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-slate-200 rounded-xl" />
          <div className="h-10 w-28 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* Metrics Stat Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
            <div className="h-4 w-24 bg-slate-100 rounded-md" />
            <div className="h-8 w-28 bg-slate-200 rounded-xl" />
            <div className="h-3 w-16 bg-slate-100 rounded-sm" />
          </div>
        ))}
      </div>

      {/* Table / List Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="h-6 w-40 bg-slate-200 rounded-lg" />
          <div className="h-9 w-64 bg-slate-100 rounded-xl" />
        </div>

        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 w-full bg-slate-50 border border-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
