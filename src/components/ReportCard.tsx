import { CheckCircle2, MapPin, ThumbsUp } from "lucide-react";
import type { CivicReport } from "../types/report";
import { StatusBadge } from "./StatusBadge";

interface ReportCardProps {
  report: CivicReport;
  confirmed?: boolean;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  onConfirm?: (reportId: string) => void;
  showConfirmAction?: boolean;
}

function formatReportDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatCategory(category: string) {
  return category.replace("-", " ");
}

export function ReportCard({
  confirmDisabled = false,
  confirmLoading = false,
  confirmed = false,
  onConfirm,
  report,
  showConfirmAction = true,
}: ReportCardProps) {
  return (
    <article className="rounded-lg border border-civic-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{report.id}</p>
          <h2 className="mt-1 text-base font-bold text-civic-ink">{report.title}</h2>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-600">{report.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
        <span className="inline-flex items-center gap-1 rounded-md bg-civic-field px-2 py-1">
          <MapPin size={13} aria-hidden="true" />
          {report.barangay}
        </span>
        <span className="rounded-md bg-civic-field px-2 py-1 capitalize">{formatCategory(report.category)}</span>
        <span className="rounded-md bg-civic-field px-2 py-1">{formatReportDate(report.createdAt)}</span>
        <span className="rounded-md bg-civic-field px-2 py-1">{report.upvotes} confirmations</span>
      </div>

      {showConfirmAction ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-civic-line pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-500">
            Confirm if you also saw this issue in the area.
          </p>
          <button
            type="button"
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              confirmed
                ? "bg-emerald-50 text-civic-green"
                : "bg-civic-green text-white hover:bg-emerald-800"
            }`}
            disabled={confirmDisabled || confirmed || confirmLoading}
            onClick={() => onConfirm?.(report.id)}
          >
            {confirmed ? <CheckCircle2 size={17} aria-hidden="true" /> : <ThumbsUp size={17} aria-hidden="true" />}
            {confirmLoading ? "Confirming..." : confirmed ? "Confirmed" : "Confirm"}
          </button>
        </div>
      ) : null}
    </article>
  );
}
