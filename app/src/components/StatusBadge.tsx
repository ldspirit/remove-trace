"use client";

const statusConfig: Record<string, { label: string; classes: string }> = {
  not_started: {
    label: "Not Started",
    classes: "bg-slate-100 text-slate-700",
  },
  in_progress: {
    label: "In Progress",
    classes: "bg-yellow-100 text-yellow-800",
  },
  completed: {
    label: "Completed",
    classes: "bg-green-100 text-green-800",
  },
  unfriend_ready: {
    label: "Unfriend Ready",
    classes: "bg-blue-100 text-blue-800",
  },
  unfriended: {
    label: "Unfriended",
    classes: "bg-purple-100 text-purple-800",
  },
  blocked: {
    label: "Blocked",
    classes: "bg-red-100 text-red-800",
  },
  pending: {
    label: "Pending",
    classes: "bg-slate-100 text-slate-700",
  },
  skipped: {
    label: "Skipped",
    classes: "bg-orange-100 text-orange-700",
  },
  review_later: {
    label: "Review Later",
    classes: "bg-amber-100 text-amber-800",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    label: status,
    classes: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
