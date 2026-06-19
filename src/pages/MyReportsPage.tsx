import { ClipboardList, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { ReportCard } from "../components/ReportCard";
import { useReports } from "../hooks/useReports";
import { useAuth } from "../lib/auth";

export function MyReportsPage() {
  const { user } = useAuth();
  const { displayReports, error, loading, usingSampleData } = useReports(user?.uid);
  const myReports = displayReports.filter((report) => report.createdBy === user?.uid);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 rounded-lg border border-civic-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-civic-green">
            <ClipboardList size={22} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-civic-ink">My Reports</h2>
            <p className="text-sm text-slate-600">Track the civic issues you submitted.</p>
          </div>
        </div>
        <Link
          to="/submit"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-civic-green px-4 text-sm font-bold text-white hover:bg-emerald-800"
        >
          <PlusCircle size={18} aria-hidden="true" />
          Submit New Report
        </Link>
      </section>

      {loading ? (
        <p className="rounded-lg border border-civic-line bg-white p-4 text-sm font-semibold text-slate-600">
          Loading your reports...
        </p>
      ) : null}

      {error ? <p className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-civic-red">{error}</p> : null}

      {usingSampleData ? (
        <p className="rounded-lg bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          No submitted reports yet. Submit your first report to start tracking.
        </p>
      ) : null}

      {myReports.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {myReports.map((report) => (
            <ReportCard key={report.id} report={report} showConfirmAction={false} />
          ))}
        </div>
      ) : null}

      {!loading && myReports.length === 0 ? (
        <div className="rounded-lg border border-civic-line bg-white p-6 text-center">
          <p className="text-base font-bold text-civic-ink">You have not submitted a report yet.</p>
          <p className="mt-2 text-sm text-slate-600">
            Use the submit form when you see a civic issue so it can appear on the public map.
          </p>
        </div>
      ) : null}
    </div>
  );
}
