import { useMemo, useState } from "react";
import { Filter, Search, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReportMap } from "../components/ReportMap";
import { ReportCard } from "../components/ReportCard";
import { davaoRegionAreas } from "../data/davaoRegion";
import { useReports } from "../hooks/useReports";
import { useAuth } from "../lib/auth";
import { confirmReport } from "../lib/reports";
import type { ReportCategory, ReportStatus } from "../types/report";

const reportStatuses: ReportStatus[] = ["submitted", "under-review", "in-progress", "resolved"];
const reportCategories: ReportCategory[] = [
  "pothole",
  "streetlight",
  "flooding",
  "garbage",
  "drainage",
  "illegal-dumping",
  "other",
];

type SortMode = "newest" | "most-confirmed" | "status";

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export function ReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { confirmedReportIds, displayReports, error, loading, usingSampleData } = useReports(user?.uid);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | "all">("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [confirmingReportId, setConfirmingReportId] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const areaOptions = useMemo(() => {
    return Array.from(new Set([...davaoRegionAreas, ...displayReports.map((report) => report.barangay)])).filter(Boolean);
  }, [displayReports]);

  const filteredReports = useMemo(() => {
    const normalizedSearch = normalize(searchTerm);

    return displayReports
      .filter((report) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          normalize(`${report.title} ${report.description} ${report.barangay} ${report.category}`).includes(
            normalizedSearch,
          );
        const matchesStatus = statusFilter === "all" || report.status === statusFilter;
        const matchesCategory = categoryFilter === "all" || report.category === categoryFilter;
        const matchesArea = areaFilter === "all" || report.barangay === areaFilter;

        return matchesSearch && matchesStatus && matchesCategory && matchesArea;
      })
      .sort((firstReport, secondReport) => {
        if (sortMode === "most-confirmed") {
          return secondReport.upvotes - firstReport.upvotes;
        }

        if (sortMode === "status") {
          return firstReport.status.localeCompare(secondReport.status);
        }

        return new Date(secondReport.createdAt).getTime() - new Date(firstReport.createdAt).getTime();
      });
  }, [areaFilter, categoryFilter, displayReports, searchTerm, sortMode, statusFilter]);

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setAreaFilter("all");
    setSortMode("newest");
  }

  async function handleConfirm(reportId: string) {
    setActionMessage("");

    if (!user) {
      navigate("/auth");
      return;
    }

    if (usingSampleData) {
      setActionMessage("Submit or load real Firestore reports before confirming.");
      return;
    }

    setConfirmingReportId(reportId);

    try {
      await confirmReport(reportId, user.uid);
      setActionMessage("Report confirmed. Thanks for helping verify the issue.");
    } catch (confirmationError) {
      setActionMessage(
        confirmationError instanceof Error
          ? confirmationError.message
          : "Confirmation failed. Please try again.",
      );
    } finally {
      setConfirmingReportId("");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_0.9fr]">
      <section className="min-h-[540px] overflow-hidden rounded-lg border border-civic-line bg-white">
        <div className="relative h-full min-h-[540px]">
          <ReportMap reports={filteredReports} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-lg border border-civic-line bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="h-11 w-full rounded-lg border border-civic-line bg-white pl-10 pr-3 text-sm outline-none focus:border-civic-green focus:ring-2 focus:ring-emerald-100"
                placeholder="Search reports"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-civic-line bg-civic-field px-4 text-sm font-semibold text-civic-ink"
              onClick={clearFilters}
              type="button"
            >
              <Filter size={18} aria-hidden="true" />
              Clear
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
                <SlidersHorizontal size={14} aria-hidden="true" />
                Status
              </span>
              <select
                className="h-10 w-full rounded-lg border border-civic-line bg-white px-3 text-sm font-semibold text-civic-ink outline-none focus:border-civic-green"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ReportStatus | "all")}
              >
                <option value="all">All statuses</option>
                {reportStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Category</span>
              <select
                className="h-10 w-full rounded-lg border border-civic-line bg-white px-3 text-sm font-semibold text-civic-ink outline-none focus:border-civic-green"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as ReportCategory | "all")}
              >
                <option value="all">All categories</option>
                {reportCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Area</span>
              <select
                className="h-10 w-full rounded-lg border border-civic-line bg-white px-3 text-sm font-semibold text-civic-ink outline-none focus:border-civic-green"
                value={areaFilter}
                onChange={(event) => setAreaFilter(event.target.value)}
              >
                <option value="all">All areas</option>
                {areaOptions.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Sort</span>
              <select
                className="h-10 w-full rounded-lg border border-civic-line bg-white px-3 text-sm font-semibold text-civic-ink outline-none focus:border-civic-green"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
              >
                <option value="newest">Newest first</option>
                <option value="most-confirmed">Most confirmed</option>
                <option value="status">Status</option>
              </select>
            </label>
          </div>
          {loading ? <p className="mt-3 text-sm font-semibold text-slate-500">Loading Firestore reports...</p> : null}
          {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-civic-red">{error}</p> : null}
          {actionMessage ? (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-civic-green">
              {actionMessage}
            </p>
          ) : null}
          {usingSampleData ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              No Firestore reports yet. Showing sample data until the first report is submitted.
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              confirmDisabled={usingSampleData || report.createdBy === user?.uid}
              confirmLoading={confirmingReportId === report.id}
              confirmed={confirmedReportIds.has(report.id)}
              onConfirm={handleConfirm}
              report={report}
            />
          ))}
          {filteredReports.length === 0 ? (
            <div className="rounded-lg border border-civic-line bg-white p-5 text-sm font-semibold text-slate-600">
              No reports match the current filters.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
