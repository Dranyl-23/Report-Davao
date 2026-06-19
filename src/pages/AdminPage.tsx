import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileCog,
  Filter,
  History,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { LocationPreviewMap } from "../components/LocationPreviewMap";
import { StatusBadge } from "../components/StatusBadge";
import { StatusTimeline } from "../components/StatusTimeline";
import { davaoRegionAreas } from "../data/davaoRegion";
import { useReports } from "../hooks/useReports";
import {
  listenToAdminConfirmations,
  listenToAdminUsers,
  listenToAuditLogs,
  listenToLgus,
  listenToStatusLogs,
  listenToSystemSettings,
  listenToWorkflowSettings,
  saveLguAccount,
  saveSystemSettings,
  saveWorkflowSettings,
  updateUserAdminFields,
  type AdminConfirmation,
  type AdminUserProfile,
  type AuditLog,
  type LguAccount,
  type LguAccountDraft,
  type LguPlan,
  type LguStatus,
  type SystemSettings,
  type WorkflowSettings,
} from "../lib/admin";
import { useAuth, type UserRole } from "../lib/auth";
import { updateReportAdminFields } from "../lib/reports";
import type { CivicReport, ReportCategory, ReportReviewFlag, ReportStatus } from "../types/report";

type AdminSection = "dashboard" | "reports" | "users" | "lgus" | "workflow" | "audit" | "settings";
type DateFilter = "all" | "today" | "week" | "month";

interface PendingAdminAction {
  confirmLabel: string;
  description: string;
  onConfirm: () => Promise<void>;
  title: string;
  tone: "danger" | "normal";
}

const adminSections: Array<{ id: AdminSection; label: string; icon: typeof BarChart3 }> = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "reports", label: "Reports", icon: ClipboardList },
  { id: "users", label: "Users", icon: Users },
  { id: "lgus", label: "LGUs", icon: Building2 },
  { id: "workflow", label: "Categories & Workflow", icon: FileCog },
  { id: "audit", label: "Audit Logs", icon: History },
  { id: "settings", label: "System Settings", icon: Settings },
];

const statuses: ReportStatus[] = ["submitted", "under-review", "in-progress", "resolved"];
const categories: ReportCategory[] = ["pothole", "streetlight", "flooding", "garbage", "drainage", "illegal-dumping", "other"];
const reviewFlags: ReportReviewFlag[] = ["active", "duplicate", "spam", "invalid"];
const roles: UserRole[] = ["citizen", "staff", "lgu-admin", "super-admin"];
const departments = ["Engineering", "CENRO", "Traffic", "DRRMO", "Barangay Response", "General Services"];
const lguPlans: LguPlan[] = ["free-pilot", "basic", "pro", "premium"];
const lguStatuses: LguStatus[] = ["pilot", "active", "paused"];

const defaultSystemSettings: SystemSettings = {
  allowedImageTypes: ["image/jpeg", "image/png", "image/webp"],
  blockedWords: [],
  duplicateRadiusMeters: 150,
  maintenanceMode: false,
  maxImageSizeMb: 5,
  pwaInstallPrompt: true,
  reportLimitPerDay: 20,
  reportLimitPerHour: 5,
};

const defaultWorkflowSettings: WorkflowSettings = {
  rejectionReasons: ["Duplicate report", "Invalid location", "Insufficient details", "Spam or abusive content"],
};

const emptyLguDraft: LguAccountDraft = {
  adminEmail: "",
  area: "Davao City",
  name: "",
  plan: "free-pilot",
  status: "pilot",
};

function humanize(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value?: string) {
  if (!value) {
    return "Not recorded";
  }

  return new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function isWithinDateFilter(createdAt: string, filter: DateFilter) {
  if (filter === "all") {
    return true;
  }

  const createdMs = new Date(createdAt).getTime();
  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  if (filter === "today") {
    return nowMs - createdMs <= dayMs;
  }

  if (filter === "week") {
    return nowMs - createdMs <= 7 * dayMs;
  }

  return nowMs - createdMs <= 30 * dayMs;
}

function exportReportsCsv(reports: CivicReport[]) {
  const headers = ["ID", "Title", "Category", "Area", "Status", "Review Flag", "Confirmations", "Submitted"];
  const rows = reports.map((report) => [
    report.id,
    `"${report.title.replace(/"/g, '""')}"`,
    report.category,
    report.barangay,
    report.status,
    report.reviewFlag ?? "active",
    String(report.upvotes),
    new Date(report.createdAt).toLocaleString("en-PH"),
  ]);

  const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `report-davao-admin-export-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function smallBadge(tone: "green" | "blue" | "amber" | "red" | "slate", label: string, key = label) {
  const styles = {
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    blue: "bg-blue-50 text-blue-800 ring-blue-200",
    green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    red: "bg-red-50 text-red-800 ring-red-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return <span key={key} className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ring-1 ${styles[tone]}`}>{label}</span>;
}

export function AdminPage() {
  const { user } = useAuth();
  const { displayReports, error: reportsError, loading: reportsLoading, usingSampleData } = useReports();
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [adminUsers, setAdminUsers] = useState<AdminUserProfile[]>([]);
  const [lgus, setLgus] = useState<LguAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [statusLogs, setStatusLogs] = useState<AuditLog[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSystemSettings);
  const [workflowSettings, setWorkflowSettings] = useState<WorkflowSettings>(defaultWorkflowSettings);
  const [adminErrors, setAdminErrors] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState("");
  const [selectedReport, setSelectedReport] = useState<CivicReport | null>(null);
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState<ReportStatus | "all">("all");
  const [reportCategoryFilter, setReportCategoryFilter] = useState<ReportCategory | "all">("all");
  const [reportAreaFilter, setReportAreaFilter] = useState("all");
  const [reportDateFilter, setReportDateFilter] = useState<DateFilter>("all");
  const [userSearch, setUserSearch] = useState("");
  const [lguDraft, setLguDraft] = useState<LguAccountDraft>(emptyLguDraft);
  const [systemDraft, setSystemDraft] = useState<SystemSettings>(defaultSystemSettings);
  const [workflowDraft, setWorkflowDraft] = useState(defaultWorkflowSettings.rejectionReasons.join("\n"));
  const [pendingAction, setPendingAction] = useState<PendingAdminAction | null>(null);
  const [pendingActionLoading, setPendingActionLoading] = useState(false);

  useEffect(() => {
    const pushError = (message: string) => setAdminErrors((current) => Array.from(new Set([...current, message])));
    const unsubUsers = listenToAdminUsers(setAdminUsers, pushError);
    const unsubLgus = listenToLgus(setLgus, pushError);
    const unsubAudit = listenToAuditLogs(setAuditLogs, pushError);
    const unsubStatus = listenToStatusLogs(setStatusLogs, pushError);
    const unsubSystem = listenToSystemSettings((settings) => {
      setSystemSettings(settings);
      setSystemDraft(settings);
    }, pushError);
    const unsubWorkflow = listenToWorkflowSettings((settings) => {
      setWorkflowSettings(settings);
      setWorkflowDraft(settings.rejectionReasons.join("\n"));
    }, pushError);

    return () => {
      unsubUsers();
      unsubLgus();
      unsubAudit();
      unsubStatus();
      unsubSystem();
      unsubWorkflow();
    };
  }, []);

  const filteredReports = useMemo(() => {
    const normalizedSearch = normalize(reportSearch);

    return displayReports.filter((report) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        normalize(`${report.title} ${report.description} ${report.barangay} ${report.category}`).includes(normalizedSearch);
      const matchesStatus = reportStatusFilter === "all" || report.status === reportStatusFilter;
      const matchesCategory = reportCategoryFilter === "all" || report.category === reportCategoryFilter;
      const matchesArea = reportAreaFilter === "all" || report.barangay === reportAreaFilter;
      const matchesDate = isWithinDateFilter(report.createdAt, reportDateFilter);

      return matchesSearch && matchesStatus && matchesCategory && matchesArea && matchesDate;
    });
  }, [displayReports, reportAreaFilter, reportCategoryFilter, reportDateFilter, reportSearch, reportStatusFilter]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = normalize(userSearch);

    return adminUsers.filter((user) =>
      normalize(
        `${user.email ?? ""} ${user.displayName ?? ""} ${user.residenceArea ?? ""} ${user.residenceDistrict ?? ""} ${
          user.residenceBarangay ?? ""
        }`,
      ).includes(normalizedSearch),
    );
  }, [adminUsers, userSearch]);

  const allAuditLogs = useMemo(() => {
    return [...auditLogs, ...statusLogs]
      .sort((first, second) => new Date(second.createdAt ?? 0).getTime() - new Date(first.createdAt ?? 0).getTime())
      .slice(0, 100);
  }, [auditLogs, statusLogs]);

  const reportStats = useMemo(() => {
    return {
      total: displayReports.length,
      submitted: displayReports.filter((report) => report.status === "submitted").length,
      review: displayReports.filter((report) => report.status === "under-review").length,
      progress: displayReports.filter((report) => report.status === "in-progress").length,
      resolved: displayReports.filter((report) => report.status === "resolved").length,
    };
  }, [displayReports]);

  async function handleReportUpdate(report: CivicReport, fields: Parameters<typeof updateReportAdminFields>[1], summary: string) {
    setActionMessage("");

    if (usingSampleData) {
      setActionMessage("Live reports are required before admin updates can be saved.");
      return;
    }

    try {
      await updateReportAdminFields(report.id, fields, summary);
      setActionMessage(summary);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Report update failed.");
    }
  }

  async function handleUserUpdate(uid: string, fields: Parameters<typeof updateUserAdminFields>[1]) {
    setActionMessage("");

    if (uid === user?.uid && fields.disabled === true) {
      setActionMessage("You cannot disable your own super admin account.");
      return;
    }

    if (uid === user?.uid && fields.role && fields.role !== "super-admin") {
      setActionMessage("You cannot downgrade your own super admin role.");
      return;
    }

    try {
      await updateUserAdminFields(uid, fields);
      setActionMessage("User account updated.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "User update failed.");
    }
  }

  async function handleSaveLgu(draft: LguAccountDraft, lguId?: string) {
    setActionMessage("");

    if (draft.name.trim().length < 2 || draft.area.trim().length < 2) {
      setActionMessage("LGU name and coverage area are required.");
      return;
    }

    try {
      await saveLguAccount(draft, lguId);
      setActionMessage("LGU account saved.");
      if (!lguId) {
        setLguDraft(emptyLguDraft);
      }
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "LGU save failed.");
    }
  }

  async function handleSaveSystemSettings() {
    try {
      await saveSystemSettings(systemDraft);
      setActionMessage("System settings saved.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "System settings save failed.");
    }
  }

  async function handleSaveWorkflowSettings() {
    const rejectionReasons = workflowDraft
      .split("\n")
      .map((reason) => reason.trim())
      .filter(Boolean);

    try {
      await saveWorkflowSettings({ rejectionReasons });
      setActionMessage("Workflow settings saved.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Workflow settings save failed.");
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) {
      return;
    }

    setPendingActionLoading(true);

    try {
      await pendingAction.onConfirm();
      setPendingAction(null);
    } finally {
      setPendingActionLoading(false);
    }
  }

  function requestDangerConfirmation(action: PendingAdminAction) {
    setPendingAction(action);
  }

  function renderDashboard() {
    const cards = [
      { label: "Total reports", value: reportStats.total, icon: ClipboardList, tone: "bg-blue-50 text-civic-blue" },
      { label: "Submitted", value: reportStats.submitted, icon: AlertTriangle, tone: "bg-slate-100 text-slate-700" },
      { label: "Under review", value: reportStats.review, icon: ShieldCheck, tone: "bg-amber-50 text-civic-amber" },
      { label: "In progress", value: reportStats.progress, icon: SlidersHorizontal, tone: "bg-blue-50 text-civic-blue" },
      { label: "Resolved", value: reportStats.resolved, icon: CheckCircle2, tone: "bg-emerald-50 text-civic-green" },
      { label: "Citizens", value: adminUsers.filter((user) => user.role === "citizen").length, icon: Users, tone: "bg-emerald-50 text-civic-green" },
      { label: "Active LGUs", value: lgus.filter((lgu) => lgu.status !== "paused").length, icon: Building2, tone: "bg-blue-50 text-civic-blue" },
      { label: "Audit events", value: allAuditLogs.length, icon: History, tone: "bg-slate-100 text-slate-700" },
    ];

    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div key={card.label} className="rounded-lg border border-civic-line bg-white p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.tone}`}>
                  <Icon size={20} aria-hidden="true" />
                </div>
                <p className="mt-4 text-2xl font-bold text-civic-ink">{card.value}</p>
                <p className="text-sm font-semibold text-slate-600">{card.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
          <section className="rounded-lg border border-civic-line bg-white p-5">
            <h3 className="text-lg font-bold text-civic-ink">Recent Activity</h3>
            <div className="mt-4 space-y-3">
              {allAuditLogs.slice(0, 6).map((log) => (
                <div key={`${log.action}-${log.id}`} className="rounded-lg bg-civic-field p-3">
                  <p className="text-sm font-bold text-civic-ink">{log.summary}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(log.createdAt)}</p>
                </div>
              ))}
              {allAuditLogs.length === 0 ? <p className="rounded-lg bg-civic-field p-3 text-sm font-semibold text-slate-600">No admin activity yet.</p> : null}
            </div>
          </section>

          <section className="rounded-lg border border-civic-line bg-white p-5">
            <h3 className="text-lg font-bold text-civic-ink">Operational Focus</h3>
            <div className="mt-4 space-y-3">
              <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                {reportStats.submitted + reportStats.review} reports need review or triage.
              </p>
              <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-civic-green">
                {lgus.length} LGU accounts are configured for rollout tracking.
              </p>
              <p className="rounded-lg bg-civic-field p-3 text-sm font-semibold text-slate-700">
                Duplicate radius: {systemSettings.duplicateRadiusMeters} meters
              </p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderReports() {
    return (
      <div className="space-y-4">
        <section className="rounded-lg border border-civic-line bg-white p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="text-lg font-bold text-civic-ink">Report Management</h3>
              <p className="text-sm text-slate-600">Review, assign, and update submitted reports.</p>
            </div>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-civic-line bg-civic-field px-3 text-sm font-bold text-civic-ink hover:bg-white"
              disabled={filteredReports.length === 0}
              onClick={() => exportReportsCsv(filteredReports)}
              type="button"
            >
              <Download size={17} aria-hidden="true" />
              Export CSV
            </button>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[1.4fr_repeat(4,1fr)]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-11 w-full rounded-lg border border-civic-line bg-white pl-9 pr-3 text-sm outline-none focus:border-civic-green focus:ring-2 focus:ring-emerald-100"
                onChange={(event) => setReportSearch(event.target.value)}
                placeholder="Search reports"
                value={reportSearch}
              />
            </label>
            <select className="h-11 rounded-lg border border-civic-line bg-white px-3 text-sm font-semibold" onChange={(event) => setReportStatusFilter(event.target.value as ReportStatus | "all")} value={reportStatusFilter}>
              <option value="all">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
            </select>
            <select className="h-11 rounded-lg border border-civic-line bg-white px-3 text-sm font-semibold" onChange={(event) => setReportCategoryFilter(event.target.value as ReportCategory | "all")} value={reportCategoryFilter}>
              <option value="all">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{humanize(category)}</option>)}
            </select>
            <select className="h-11 rounded-lg border border-civic-line bg-white px-3 text-sm font-semibold" onChange={(event) => setReportAreaFilter(event.target.value)} value={reportAreaFilter}>
              <option value="all">All areas</option>
              {davaoRegionAreas.map((area) => <option key={area} value={area}>{area}</option>)}
            </select>
            <select className="h-11 rounded-lg border border-civic-line bg-white px-3 text-sm font-semibold" onChange={(event) => setReportDateFilter(event.target.value as DateFilter)} value={reportDateFilter}>
              <option value="all">Any date</option>
              <option value="today">Last 24 hours</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
            </select>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-civic-line bg-white">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.65fr_0.9fr_0.8fr] gap-3 border-b border-civic-line bg-civic-field px-4 py-3 text-xs font-bold uppercase text-slate-500">
              <span>Report</span>
              <span>Area</span>
              <span>Status</span>
              <span>Flag</span>
              <span>Assignment</span>
              <span>Action</span>
            </div>
            {filteredReports.map((report) => (
              <div key={report.id} className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.65fr_0.9fr_0.8fr] items-center gap-3 border-b border-civic-line px-4 py-4 last:border-b-0">
                <div>
                  <p className="text-sm font-bold text-civic-ink">{report.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{report.id} | {formatDate(report.createdAt)}</p>
                </div>
                <p className="text-sm font-semibold text-slate-700">{report.barangay}</p>
                <select
                  className="h-9 rounded-lg border border-civic-line bg-white px-2 text-xs font-bold text-civic-ink"
                  disabled={usingSampleData}
                  onChange={(event) => handleReportUpdate(report, { status: event.target.value as ReportStatus }, `Status changed to ${humanize(event.target.value)}.`)}
                  value={report.status}
                >
                  {statuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
                </select>
                <select
                  className="h-9 rounded-lg border border-civic-line bg-white px-2 text-xs font-bold text-civic-ink"
                  disabled={usingSampleData}
                  onChange={(event) => {
                    const nextFlag = event.target.value as ReportReviewFlag;

                    if (nextFlag === "active") {
                      handleReportUpdate(report, { reviewFlag: nextFlag }, "Report review flag cleared.");
                      return;
                    }

                    requestDangerConfirmation({
                      confirmLabel: `Mark ${humanize(nextFlag)}`,
                      description: `This will mark "${report.title}" as ${humanize(nextFlag)} in the admin review queue.`,
                      onConfirm: () =>
                        handleReportUpdate(report, { reviewFlag: nextFlag }, `Report marked as ${humanize(nextFlag)}.`),
                      title: "Confirm report review flag",
                      tone: "danger",
                    });
                  }}
                  value={report.reviewFlag ?? "active"}
                >
                  {reviewFlags.map((flag) => <option key={flag} value={flag}>{humanize(flag)}</option>)}
                </select>
                <div className="grid gap-2">
                  <select
                    className="h-9 rounded-lg border border-civic-line bg-white px-2 text-xs font-bold text-civic-ink"
                    disabled={usingSampleData}
                    onChange={(event) => handleReportUpdate(report, { assignedLguId: event.target.value }, "LGU assignment updated.")}
                    value={report.assignedLguId ?? ""}
                  >
                    <option value="">No LGU</option>
                    {lgus.map((lgu) => <option key={lgu.id} value={lgu.id}>{lgu.name}</option>)}
                  </select>
                  <select
                    className="h-9 rounded-lg border border-civic-line bg-white px-2 text-xs font-bold text-civic-ink"
                    disabled={usingSampleData}
                    onChange={(event) => handleReportUpdate(report, { assignedDepartment: event.target.value }, "Department assignment updated.")}
                    value={report.assignedDepartment ?? ""}
                  >
                    <option value="">No department</option>
                    {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                  </select>
                </div>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-civic-green px-3 text-xs font-bold text-white hover:bg-emerald-700"
                  onClick={() => setSelectedReport(report)}
                  type="button"
                >
                  <Eye size={16} aria-hidden="true" />
                  Details
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  function renderUsers() {
    return (
      <div className="space-y-4">
        <section className="rounded-lg border border-civic-line bg-white p-4">
          <h3 className="text-lg font-bold text-civic-ink">User Management</h3>
          <p className="text-sm text-slate-600">View profiles, restrict accounts, and assign platform roles.</p>
          <label className="relative mt-4 block max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-11 w-full rounded-lg border border-civic-line bg-white pl-9 pr-3 text-sm outline-none focus:border-civic-green focus:ring-2 focus:ring-emerald-100"
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search users by email, name, or residence"
              value={userSearch}
            />
          </label>
        </section>

        <section className="overflow-hidden rounded-lg border border-civic-line bg-white">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[1fr_1fr_0.7fr_0.7fr_0.8fr] gap-3 border-b border-civic-line bg-civic-field px-4 py-3 text-xs font-bold uppercase text-slate-500">
              <span>User</span>
              <span>Residence</span>
              <span>Role</span>
              <span>Status</span>
              <span>Assignment</span>
            </div>
            {filteredUsers.map((adminUser) => {
              const isCurrentUser = adminUser.uid === user?.uid;

              return (
                <div key={adminUser.uid} className="grid grid-cols-[1fr_1fr_0.7fr_0.7fr_0.8fr] items-center gap-3 border-b border-civic-line px-4 py-4 last:border-b-0">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-civic-ink">{adminUser.displayName || "Report Davao Citizen"}</p>
                      {isCurrentUser ? smallBadge("green", "Current account", `${adminUser.uid}-current`) : null}
                    </div>
                    <p className="mt-1 break-all text-xs text-slate-500">{adminUser.email ?? adminUser.uid}</p>
                    <p className="mt-1 text-xs text-slate-500">Joined {formatDate(adminUser.createdAt)}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    {[adminUser.residenceArea, adminUser.residenceDistrict, adminUser.residenceBarangay].filter(Boolean).join(" | ") || "Not completed"}
                  </p>
                  <select
                    className="h-9 rounded-lg border border-civic-line bg-white px-2 text-xs font-bold text-civic-ink disabled:cursor-not-allowed disabled:bg-civic-field disabled:text-slate-500"
                    disabled={isCurrentUser}
                    onChange={(event) => {
                      const nextRole = event.target.value as UserRole;

                      requestDangerConfirmation({
                        confirmLabel: "Change role",
                        description: `This will change ${adminUser.email ?? adminUser.uid} from ${humanize(adminUser.role)} to ${humanize(nextRole)}.`,
                        onConfirm: () => handleUserUpdate(adminUser.uid, { role: nextRole }),
                        title: "Confirm role change",
                        tone: nextRole === "super-admin" || adminUser.role === "super-admin" ? "danger" : "normal",
                      });
                    }}
                    value={adminUser.role}
                  >
                    {roles.map((role) => <option key={role} value={role}>{humanize(role)}</option>)}
                  </select>
                  <button
                    className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60 ${
                      adminUser.disabled ? "bg-red-50 text-red-800 ring-1 ring-red-200" : "bg-emerald-50 text-civic-green ring-1 ring-emerald-200"
                    }`}
                    disabled={isCurrentUser}
                    onClick={() =>
                      requestDangerConfirmation({
                        confirmLabel: adminUser.disabled ? "Reactivate account" : "Disable account",
                        description: adminUser.disabled
                          ? `This will reactivate ${adminUser.email ?? adminUser.uid}.`
                          : `This will restrict ${adminUser.email ?? adminUser.uid} from using protected citizen actions.`,
                        onConfirm: () => handleUserUpdate(adminUser.uid, { disabled: !adminUser.disabled }),
                        title: adminUser.disabled ? "Confirm account reactivation" : "Confirm account restriction",
                        tone: adminUser.disabled ? "normal" : "danger",
                      })
                    }
                    type="button"
                  >
                    {adminUser.disabled ? "Disabled" : "Active"}
                  </button>
                  <div className="grid gap-2">
                    <select
                      className="h-9 rounded-lg border border-civic-line bg-white px-2 text-xs font-bold text-civic-ink"
                      onChange={(event) => handleUserUpdate(adminUser.uid, { assignedArea: event.target.value })}
                      value={adminUser.assignedArea ?? ""}
                    >
                      <option value="">No area</option>
                      {davaoRegionAreas.map((area) => <option key={area} value={area}>{area}</option>)}
                    </select>
                    <select
                      className="h-9 rounded-lg border border-civic-line bg-white px-2 text-xs font-bold text-civic-ink"
                      onChange={(event) => handleUserUpdate(adminUser.uid, { assignedDepartment: event.target.value })}
                      value={adminUser.assignedDepartment ?? ""}
                    >
                      <option value="">No department</option>
                      {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  function renderLgus() {
    return (
      <div className="space-y-4">
        <section className="rounded-lg border border-civic-line bg-white p-4">
          <h3 className="text-lg font-bold text-civic-ink">LGU Management</h3>
          <p className="text-sm text-slate-600">Create partner LGU accounts and track plan status.</p>
          <div className="mt-4 grid gap-3 xl:grid-cols-[1.2fr_1fr_0.8fr_0.7fr_0.7fr_auto]">
            <input className="h-11 rounded-lg border border-civic-line px-3 text-sm" onChange={(event) => setLguDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder="LGU or barangay name" value={lguDraft.name} />
            <input className="h-11 rounded-lg border border-civic-line px-3 text-sm" onChange={(event) => setLguDraft((draft) => ({ ...draft, adminEmail: event.target.value }))} placeholder="Admin email" value={lguDraft.adminEmail} />
            <select className="h-11 rounded-lg border border-civic-line px-3 text-sm font-semibold" onChange={(event) => setLguDraft((draft) => ({ ...draft, area: event.target.value }))} value={lguDraft.area}>
              {davaoRegionAreas.map((area) => <option key={area} value={area}>{area}</option>)}
            </select>
            <select className="h-11 rounded-lg border border-civic-line px-3 text-sm font-semibold" onChange={(event) => setLguDraft((draft) => ({ ...draft, plan: event.target.value as LguPlan }))} value={lguDraft.plan}>
              {lguPlans.map((plan) => <option key={plan} value={plan}>{humanize(plan)}</option>)}
            </select>
            <select className="h-11 rounded-lg border border-civic-line px-3 text-sm font-semibold" onChange={(event) => setLguDraft((draft) => ({ ...draft, status: event.target.value as LguStatus }))} value={lguDraft.status}>
              {lguStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
            </select>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-civic-green px-4 text-sm font-bold text-white hover:bg-emerald-700" onClick={() => handleSaveLgu(lguDraft)} type="button">
              <Save size={17} aria-hidden="true" />
              Save
            </button>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          {lgus.map((lgu) => (
            <article key={lgu.id} className="rounded-lg border border-civic-line bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-base font-bold text-civic-ink">{lgu.name}</h4>
                  <p className="mt-1 text-sm text-slate-600">{lgu.area}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{lgu.adminEmail || "No admin email assigned"}</p>
                </div>
                {smallBadge(lgu.status === "active" ? "green" : lgu.status === "paused" ? "red" : "amber", humanize(lgu.status))}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <select className="h-10 rounded-lg border border-civic-line px-2 text-xs font-bold" onChange={(event) => handleSaveLgu({ ...lgu, plan: event.target.value as LguPlan }, lgu.id)} value={lgu.plan}>
                  {lguPlans.map((plan) => <option key={plan} value={plan}>{humanize(plan)}</option>)}
                </select>
                <select className="h-10 rounded-lg border border-civic-line px-2 text-xs font-bold" onChange={(event) => handleSaveLgu({ ...lgu, status: event.target.value as LguStatus }, lgu.id)} value={lgu.status}>
                  {lguStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
                </select>
                <button className="h-10 rounded-lg border border-civic-line bg-civic-field px-3 text-xs font-bold text-civic-ink hover:bg-white" onClick={() => setLguDraft({ adminEmail: lgu.adminEmail, area: lgu.area, name: lgu.name, plan: lgu.plan, status: lgu.status })} type="button">
                  Load to form
                </button>
              </div>
            </article>
          ))}
          {lgus.length === 0 ? <p className="rounded-lg border border-civic-line bg-white p-4 text-sm font-semibold text-slate-600">No LGU accounts configured yet.</p> : null}
        </section>
      </div>
    );
  }

  function renderWorkflow() {
    return (
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border border-civic-line bg-white p-5">
          <h3 className="text-lg font-bold text-civic-ink">Report Categories</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => smallBadge("slate", humanize(category)))}
          </div>
          <h3 className="mt-6 text-lg font-bold text-civic-ink">Workflow Statuses</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {statuses.map((status) => (
              <div key={status} className="rounded-lg border border-civic-line bg-civic-field p-3">
                <StatusBadge status={status} />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-civic-line bg-white p-5">
          <h3 className="text-lg font-bold text-civic-ink">Rejection / Review Reasons</h3>
          <p className="mt-2 text-sm text-slate-600">One reason per line. These support duplicate, spam, and invalid report review.</p>
          <textarea
            className="mt-4 min-h-48 w-full rounded-lg border border-civic-line p-3 text-sm outline-none focus:border-civic-green focus:ring-2 focus:ring-emerald-100"
            onChange={(event) => setWorkflowDraft(event.target.value)}
            value={workflowDraft}
          />
          <button className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-civic-green px-4 text-sm font-bold text-white hover:bg-emerald-700" onClick={handleSaveWorkflowSettings} type="button">
            <Save size={17} aria-hidden="true" />
            Save workflow
          </button>
          <p className="mt-3 text-xs font-semibold text-slate-500">Saved reasons: {workflowSettings.rejectionReasons.length}</p>
        </section>
      </div>
    );
  }

  function renderAudit() {
    return (
      <section className="rounded-lg border border-civic-line bg-white p-5">
        <h3 className="text-lg font-bold text-civic-ink">Audit Logs</h3>
        <p className="text-sm text-slate-600">Tracks status changes, role updates, LGU edits, and settings changes.</p>
        <div className="mt-4 space-y-3">
          {allAuditLogs.map((log) => (
            <div key={`${log.action}-${log.id}`} className="grid gap-3 rounded-lg border border-civic-line p-3 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-bold text-civic-ink">{log.summary}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{humanize(log.action)} | {log.targetType}:{log.targetId || "system"}</p>
              </div>
              <p className="text-xs font-bold text-slate-500">{formatDate(log.createdAt)}</p>
            </div>
          ))}
          {allAuditLogs.length === 0 ? <p className="rounded-lg bg-civic-field p-3 text-sm font-semibold text-slate-600">No audit logs recorded yet.</p> : null}
        </div>
      </section>
    );
  }

  function renderSettings() {
    return (
      <section className="rounded-lg border border-civic-line bg-white p-5">
        <h3 className="text-lg font-bold text-civic-ink">System Settings</h3>
        <p className="text-sm text-slate-600">Central admin values for limits, duplicate detection, allowed areas, and PWA behavior.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-civic-ink">
            Reports per user per hour
            <input className="h-11 rounded-lg border border-civic-line px-3 text-sm" min={1} onChange={(event) => setSystemDraft((draft) => ({ ...draft, reportLimitPerHour: Number(event.target.value) }))} type="number" value={systemDraft.reportLimitPerHour} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-civic-ink">
            Reports per user per day
            <input className="h-11 rounded-lg border border-civic-line px-3 text-sm" min={1} onChange={(event) => setSystemDraft((draft) => ({ ...draft, reportLimitPerDay: Number(event.target.value) }))} type="number" value={systemDraft.reportLimitPerDay} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-civic-ink">
            Duplicate detection radius
            <input className="h-11 rounded-lg border border-civic-line px-3 text-sm" min={25} onChange={(event) => setSystemDraft((draft) => ({ ...draft, duplicateRadiusMeters: Number(event.target.value) }))} type="number" value={systemDraft.duplicateRadiusMeters} />
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-civic-line bg-civic-field px-3 py-3 text-sm font-bold text-civic-ink">
            <input checked={systemDraft.pwaInstallPrompt} onChange={(event) => setSystemDraft((draft) => ({ ...draft, pwaInstallPrompt: event.target.checked }))} type="checkbox" />
            PWA install prompt enabled
          </label>
        </div>
        <div className="mt-5 rounded-lg bg-civic-field p-4">
          <p className="text-sm font-bold text-civic-ink">Allowed Davao coverage areas</p>
          <div className="mt-3 flex flex-wrap gap-2">{davaoRegionAreas.map((area) => smallBadge("green", area))}</div>
        </div>
        <button className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-civic-green px-4 text-sm font-bold text-white hover:bg-emerald-700" onClick={handleSaveSystemSettings} type="button">
          <Save size={17} aria-hidden="true" />
          Save settings
        </button>
      </section>
    );
  }

  function renderActiveSection() {
    if (activeSection === "reports") return renderReports();
    if (activeSection === "users") return renderUsers();
    if (activeSection === "lgus") return renderLgus();
    if (activeSection === "workflow") return renderWorkflow();
    if (activeSection === "audit") return renderAudit();
    if (activeSection === "settings") return renderSettings();
    return renderDashboard();
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-civic-line bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-civic-green">
              <ShieldCheck size={24} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-civic-green">Hidden System Owner Console</p>
              <h2 className="text-2xl font-bold text-civic-ink">Super Admin</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {smallBadge("green", "Super admin only")}
            {usingSampleData ? smallBadge("amber", "Demo report data") : smallBadge("blue", "Live report data")}
          </div>
        </div>
      </section>

      {reportsLoading ? <p className="rounded-lg border border-civic-line bg-white p-4 text-sm font-semibold text-slate-600">Loading admin data...</p> : null}
      {reportsError ? <p className="rounded-lg bg-amber-50 p-4 text-sm font-semibold text-amber-900">{reportsError}</p> : null}
      {adminErrors.length > 0 ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-civic-red">
          {adminErrors.slice(0, 2).map((message) => <p key={message}>{message}</p>)}
        </div>
      ) : null}
      {actionMessage ? <p className="rounded-lg bg-emerald-50 p-4 text-sm font-semibold text-civic-green">{actionMessage}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border border-civic-line bg-white p-3 xl:sticky xl:top-32 xl:self-start">
          <div className="mb-3 flex items-center gap-2 px-2 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Filter size={15} aria-hidden="true" />
            Console Sections
          </div>
          <nav className="grid gap-2" aria-label="Super admin sections">
            {adminSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  className={`flex h-11 items-center gap-2 rounded-lg px-3 text-left text-sm font-bold transition ${
                    isActive ? "bg-civic-ink text-white" : "bg-civic-field text-slate-700 hover:bg-white hover:text-civic-ink"
                  }`}
                  onClick={() => setActiveSection(section.id)}
                  type="button"
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div>{renderActiveSection()}</div>
      </div>

      {selectedReport ? (
        <div className="fixed inset-0 z-[1000] flex justify-end bg-slate-950/40" role="presentation" onMouseDown={() => setSelectedReport(null)}>
          <section className="h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-xl" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-civic-green">{selectedReport.id}</p>
                <h3 className="mt-1 text-xl font-bold text-civic-ink">{selectedReport.title}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge status={selectedReport.status} />
                  {smallBadge(selectedReport.reviewFlag === "active" ? "green" : selectedReport.reviewFlag === "duplicate" ? "amber" : "red", humanize(selectedReport.reviewFlag ?? "active"))}
                  {smallBadge("slate", humanize(selectedReport.category))}
                </div>
              </div>
              <button className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-civic-line bg-civic-field text-civic-ink hover:bg-white" onClick={() => setSelectedReport(null)} type="button" aria-label="Close report details">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-lg border border-civic-line bg-civic-field p-4">
                <p className="text-sm leading-6 text-slate-700">{selectedReport.description}</p>
                <p className="mt-3 text-xs font-semibold text-slate-500">
                  {selectedReport.barangay} | {formatDate(selectedReport.createdAt)} | {selectedReport.upvotes} confirmations
                </p>
              </div>

              <LocationPreviewMap
                accuracyMeters={null}
                coordinates={selectedReport.coordinates}
                hasPinnedLocation
                readOnly
              />

              {selectedReport.imageUrl ? (
                <img src={selectedReport.imageUrl} alt={selectedReport.title} className="max-h-80 w-full rounded-lg border border-civic-line object-cover" />
              ) : (
                <p className="rounded-lg bg-civic-field p-4 text-sm font-semibold text-slate-600">No photo attached to this report.</p>
              )}

              <StatusTimeline status={selectedReport.status} />
            </div>
          </section>
        </div>
      ) : null}

      {pendingAction ? (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/45 px-4" role="presentation" onMouseDown={() => !pendingActionLoading && setPendingAction(null)}>
          <section className="w-full max-w-md rounded-lg border border-civic-line bg-white p-5 shadow-xl" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${pendingAction.tone === "danger" ? "bg-red-50 text-civic-red" : "bg-blue-50 text-civic-blue"}`}>
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-civic-ink">{pendingAction.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{pendingAction.description}</p>
                </div>
              </div>
              <button
                aria-label="Cancel admin action"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-civic-field hover:text-civic-ink"
                disabled={pendingActionLoading}
                onClick={() => setPendingAction(null)}
                type="button"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                className="inline-flex h-11 items-center justify-center rounded-lg border border-civic-line bg-civic-field px-4 text-sm font-bold text-civic-ink hover:bg-white disabled:opacity-60"
                disabled={pendingActionLoading}
                onClick={() => setPendingAction(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className={`inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                  pendingAction.tone === "danger" ? "bg-civic-red hover:bg-red-700" : "bg-civic-green hover:bg-emerald-700"
                }`}
                disabled={pendingActionLoading}
                onClick={confirmPendingAction}
                type="button"
              >
                {pendingActionLoading ? "Saving..." : pendingAction.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
