import { CheckCircle2, Circle, Clock3 } from "lucide-react";
import type { ReportStatus } from "../types/report";

const timelineSteps: Array<{ status: ReportStatus; label: string }> = [
  { status: "submitted", label: "Submitted" },
  { status: "under-review", label: "Under Review" },
  { status: "in-progress", label: "In Progress" },
  { status: "resolved", label: "Resolved" },
];

interface StatusTimelineProps {
  status: ReportStatus;
}

export function StatusTimeline({ status }: StatusTimelineProps) {
  const activeIndex = timelineSteps.findIndex((step) => step.status === status);

  return (
    <div className="rounded-lg border border-civic-line bg-white p-4">
      <h3 className="text-base font-bold text-civic-ink">Status Timeline</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {timelineSteps.map((step, index) => {
          const isComplete = index < activeIndex;
          const isCurrent = index === activeIndex;
          const Icon = isComplete ? CheckCircle2 : isCurrent ? Clock3 : Circle;

          return (
            <div
              key={step.status}
              className={`rounded-lg border p-3 ${
                isComplete || isCurrent
                  ? "border-emerald-200 bg-emerald-50 text-civic-green"
                  : "border-civic-line bg-civic-field text-slate-500"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon size={18} aria-hidden="true" />
                <p className="text-sm font-bold">{step.label}</p>
              </div>
              <p className="mt-2 text-xs font-semibold">
                {isComplete ? "Done" : isCurrent ? "Current step" : "Waiting"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
