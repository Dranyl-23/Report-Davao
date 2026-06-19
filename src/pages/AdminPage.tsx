import { useState } from "react";
import { CheckCircle2, Download, ShieldCheck } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { useReports } from "../hooks/useReports";
import { updateReportStatus } from "../lib/reports";
import type { ReportStatus } from "../types/report";

const statuses: ReportStatus[] = ["submitted", "under-review", "in-progress", "resolved"];

export function AdminPage() {
  const { displayReports, error, loading, usingSampleData } = useReports();
  const [statusMessage, setStatusMessage] = useState("");

  async function handleStatusChange(reportId: string, status: ReportStatus) {
    setStatusMessage("");

    try {
      await updateReportStatus(reportId, status);
      setStatusMessage("Status updated.");
    } catch (statusError) {
      setStatusMessage(
        statusError instanceof Error
          ? statusError.message
          : "Status update failed. Check admin permissions.",
      );
    }
  }

  function exportCsv() {
    const headers = ["ID", "Title", "Category", "Area", "Status", "Confirmations", "Submitted"];
    const rows = displayReports.map((r) => [
      r.id,
      `"${r.title.replace(/"/g, '""')}"`,
      r.category,
      r.barangay,
      r.status,
      String(r.upvotes),
      new Date(r.createdAt).toLocaleString("en-PH"),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report-davao-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-civic-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-civic-blue">
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-civic-ink">Admin Dashboard</h2>
            <p className="text-sm text-slate-600">Barangay/LGU report queue</p>
          </div>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-civic-line bg-civic-field px-4 text-sm font-semibold text-civic-ink hover:bg-white disabled:opacity-50"
          disabled={usingSampleData || displayReports.length === 0}
          onClick={exportCsv}
          title={usingSampleData ? "Export is only available for real Firestore reports" : "Download all reports as CSV"}
        >
          <Download size={18} aria-hidden="true" />
          Export CSV
        </button>
      </div>

      {loading ? <p className="rounded-lg border border-civic-line bg-white p-4 text-sm font-semibold text-slate-600">Loading report queue...</p> : null}
      {error ? <p className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-civic-red">{error}</p> : null}
      {statusMessage ? (
        <p className="rounded-lg border border-civic-line bg-white p-4 text-sm font-semibold text-slate-700">
          {statusMessage}
        </p>
      ) : null}
      {usingSampleData ? (
        <p className="rounded-lg bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          No Firestore reports yet. Submit a real report first before using admin status updates.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-civic-line bg-white">
        <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-civic-line bg-civic-field px-4 py-3 text-xs font-bold uppercase text-slate-500">
          <span>Report</span>
          <span>Barangay</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {displayReports.map((report) => (
          <div key={report.id} className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-civic-line px-4 py-4 last:border-b-0">
            <div>
              <p className="text-sm font-bold text-civic-ink">{report.title}</p>
              <p className="mt-1 text-xs text-slate-500">{report.id}</p>
            </div>
            <p className="text-sm font-semibold text-slate-700">{report.barangay}</p>
            <StatusBadge status={report.status} />
            {usingSampleData ? (
              <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-200 px-3 text-xs font-bold text-slate-600" disabled>
                <CheckCircle2 size={16} aria-hidden="true" />
                Sample
              </button>
            ) : (
              <select
                className="h-9 rounded-lg border border-civic-line bg-white px-2 text-xs font-bold text-civic-ink"
                value={report.status}
                onChange={(event) => handleStatusChange(report.id, event.target.value as ReportStatus)}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
