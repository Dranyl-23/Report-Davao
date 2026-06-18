import { BarChart3, CheckCircle2, Clock3, MapPin } from "lucide-react";
import { useReports } from "../hooks/useReports";

export function StatsPage() {
  const { displayReports, usingSampleData } = useReports();
  const totalReports = displayReports.length;
  const resolvedReports = displayReports.filter((report) => report.status === "resolved").length;
  const resolvedRate = totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0;
  const pilotAreas = new Set(displayReports.map((report) => report.barangay)).size;
  const stats = [
    { label: "Total reports", value: totalReports, icon: BarChart3, tone: "text-civic-blue bg-blue-50" },
    { label: "Resolved", value: `${resolvedRate}%`, icon: CheckCircle2, tone: "text-civic-green bg-emerald-50" },
    { label: "Avg. response", value: "2.8d", icon: Clock3, tone: "text-civic-amber bg-amber-50" },
    { label: "Pilot areas", value: pilotAreas, icon: MapPin, tone: "text-civic-red bg-red-50" },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-civic-line bg-white p-5">
        <h2 className="text-xl font-bold text-civic-ink">Public Stats</h2>
        {usingSampleData ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            Showing sample stats until Firestore has report data.
          </p>
        ) : null}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-lg border border-civic-line bg-white p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.tone}`}>
                  <Icon size={20} aria-hidden="true" />
                </div>
                <p className="mt-4 text-2xl font-bold text-civic-ink">{stat.value}</p>
                <p className="text-sm font-semibold text-slate-600">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-civic-line bg-white p-5">
        <h2 className="text-xl font-bold text-civic-ink">Barangay Snapshot</h2>
        <div className="mt-4 space-y-3">
          {displayReports.map((report) => (
            <div key={report.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg bg-civic-field p-3">
              <div>
                <p className="text-sm font-bold text-civic-ink">{report.barangay}</p>
                <p className="text-xs text-slate-600">{report.title}</p>
              </div>
              <p className="text-sm font-bold text-civic-green">{report.upvotes}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
