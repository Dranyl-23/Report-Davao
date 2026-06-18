import type { ReportStatus } from "../types/report";

const statusStyles: Record<ReportStatus, string> = {
  submitted: "bg-slate-100 text-slate-700 ring-slate-200",
  "under-review": "bg-amber-50 text-amber-800 ring-amber-200",
  "in-progress": "bg-blue-50 text-blue-800 ring-blue-200",
  resolved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

const labels: Record<ReportStatus, string> = {
  submitted: "Submitted",
  "under-review": "Under Review",
  "in-progress": "In Progress",
  resolved: "Resolved",
};

interface StatusBadgeProps {
  status: ReportStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ${statusStyles[status]}`}>
      {labels[status]}
    </span>
  );
}
