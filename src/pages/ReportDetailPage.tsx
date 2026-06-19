import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, MapPin, Pencil, Save, Trash2, X } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { LocationPreviewMap } from "../components/LocationPreviewMap";
import { StatusBadge } from "../components/StatusBadge";
import { StatusTimeline } from "../components/StatusTimeline";
import { davaoRegionAreas, isWithinDavaoCoordinateBounds } from "../data/davaoRegion";
import { useReports } from "../hooks/useReports";
import { useAuth } from "../lib/auth";
import { deleteCitizenReport, updateCitizenReport } from "../lib/reports";
import type { EditableCivicReport, ReportCategory } from "../types/report";

const reportCategories: ReportCategory[] = [
  "pothole",
  "streetlight",
  "flooding",
  "garbage",
  "drainage",
  "illegal-dumping",
  "other",
];

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCategory(category: string) {
  return category.replace(/-/g, " ");
}

export function ReportDetailPage() {
  const navigate = useNavigate();
  const { reportId } = useParams();
  const { user } = useAuth();
  const { displayReports, error, loading, usingSampleData } = useReports(user?.uid);
  const report = displayReports.find((item) => item.id === reportId);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<EditableCivicReport | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  const canEdit = Boolean(user && report && report.createdBy === user.uid && report.status === "submitted" && !usingSampleData);

  const areaOptions = useMemo(() => {
    return Array.from(new Set([...davaoRegionAreas, ...(report ? [report.barangay] : [])])).filter(Boolean);
  }, [report]);

  useEffect(() => {
    if (!report) {
      return;
    }

    setFormData({
      title: report.title,
      category: report.category,
      description: report.description,
      barangay: report.barangay,
      coordinates: report.coordinates,
    });
  }, [report]);

  if (!reportId) {
    return <Navigate to="/" replace />;
  }

  if (loading && !report) {
    return (
      <div className="rounded-lg border border-civic-line bg-white p-5 text-sm font-semibold text-slate-600">
        Loading report details...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-lg border border-civic-line bg-white p-6">
        <p className="text-lg font-bold text-civic-ink">Report not found</p>
        <p className="mt-2 text-sm text-slate-600">The report may have been deleted or is not available yet.</p>
        <Link
          to="/"
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-civic-green px-4 text-sm font-bold text-white"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Back to Reports
        </Link>
      </div>
    );
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!report || !formData || !canEdit) {
      return;
    }

    const trimmedTitle = formData.title.trim();
    const trimmedDescription = formData.description.trim();

    if (trimmedTitle.length < 5 || trimmedDescription.length < 10) {
      setMessage("Please provide a clearer title and description before saving.");
      return;
    }

    if (!isWithinDavaoCoordinateBounds(formData.coordinates)) {
      setMessage("Report location must stay inside Davao Region coverage.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await updateCitizenReport(report.id, {
        ...formData,
        title: trimmedTitle,
        description: trimmedDescription,
      });
      setEditing(false);
      setMessage("Report updated.");
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Report update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!report || !canEdit) {
      return;
    }

    const confirmed = window.confirm("Delete this submitted report? This cannot be undone.");

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setMessage("");

    try {
      await deleteCitizenReport(report.id);
      navigate("/my-reports");
    } catch (deleteError) {
      setMessage(deleteError instanceof Error ? deleteError.message : "Report deletion failed.");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-civic-line bg-white p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-civic-green hover:text-emerald-800">
            <ArrowLeft size={17} aria-hidden="true" />
            Back to Reports
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase text-slate-500">{report.id}</p>
            <StatusBadge status={report.status} />
          </div>
          <h2 className="mt-2 text-2xl font-bold text-civic-ink">{report.title}</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-md bg-civic-field px-2 py-1">
              <MapPin size={13} aria-hidden="true" />
              {report.barangay}
            </span>
            <span className="rounded-md bg-civic-field px-2 py-1 capitalize">{formatCategory(report.category)}</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-civic-field px-2 py-1">
              <CalendarDays size={13} aria-hidden="true" />
              {formatDate(report.createdAt)}
            </span>
            <span className="rounded-md bg-civic-field px-2 py-1">{report.upvotes} confirmations</span>
          </div>
        </div>
        {canEdit ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-civic-line bg-civic-field px-3 text-sm font-bold text-civic-ink hover:bg-white"
              onClick={() => {
                setEditing((isEditing) => !isEditing);
                setMessage("");
              }}
            >
              {editing ? <X size={17} aria-hidden="true" /> : <Pencil size={17} aria-hidden="true" />}
              {editing ? "Cancel Edit" : "Edit"}
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-50 px-3 text-sm font-bold text-civic-red hover:bg-red-100 disabled:opacity-60"
              disabled={deleting}
              onClick={handleDelete}
            >
              <Trash2 size={17} aria-hidden="true" />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        ) : null}
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-civic-red">{error}</p> : null}
      {message ? <p className="rounded-lg bg-amber-50 p-4 text-sm font-semibold text-amber-800">{message}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <section className="space-y-5">
          {report.imageUrl ? (
            <div className="overflow-hidden rounded-lg border border-civic-line bg-white">
              <img src={report.imageUrl} alt={`Evidence for ${report.title}`} className="max-h-[520px] w-full object-cover" />
              <div className="border-t border-civic-line px-5 py-3">
                <p className="text-sm font-bold text-civic-ink">Evidence Photo</p>
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-civic-line bg-white p-5">
            <h3 className="text-base font-bold text-civic-ink">Description</h3>
            <p className="mt-3 text-sm leading-7 text-slate-700">{report.description}</p>
          </div>

          <StatusTimeline status={report.status} />

          {editing && formData ? (
            <form className="space-y-4 rounded-lg border border-civic-line bg-white p-5" onSubmit={handleSave}>
              <h3 className="text-base font-bold text-civic-ink">Edit Submitted Report</h3>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Report title</span>
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-civic-line px-3 text-sm outline-none focus:border-civic-green focus:ring-2 focus:ring-emerald-100"
                  value={formData.title}
                  onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                  required
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Category</span>
                  <select
                    className="mt-2 h-11 w-full rounded-lg border border-civic-line bg-white px-3 text-sm outline-none focus:border-civic-green"
                    value={formData.category}
                    onChange={(event) =>
                      setFormData({ ...formData, category: event.target.value as ReportCategory })
                    }
                  >
                    {reportCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Coverage Area</span>
                  <select
                    className="mt-2 h-11 w-full rounded-lg border border-civic-line bg-white px-3 text-sm outline-none focus:border-civic-green"
                    value={formData.barangay}
                    onChange={(event) => setFormData({ ...formData, barangay: event.target.value })}
                  >
                    {areaOptions.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Description</span>
                <textarea
                  className="mt-2 min-h-28 w-full resize-y rounded-lg border border-civic-line px-3 py-3 text-sm outline-none focus:border-civic-green focus:ring-2 focus:ring-emerald-100"
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  required
                />
              </label>
              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Report pin</span>
                <LocationPreviewMap
                  accuracyMeters={null}
                  coordinates={formData.coordinates}
                  hasPinnedLocation
                  onLocationPicked={(coordinates) => setFormData({ ...formData, coordinates })}
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-civic-green px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                disabled={saving}
              >
                <Save size={17} aria-hidden="true" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          ) : null}
        </section>

        <section className="space-y-5">
          <div className="rounded-lg border border-civic-line bg-white p-5">
            <h3 className="mb-3 text-base font-bold text-civic-ink">Report Location</h3>
            <LocationPreviewMap
              accuracyMeters={null}
              coordinates={report.coordinates}
              hasPinnedLocation
              readOnly
            />
          </div>
          <div className="rounded-lg border border-civic-line bg-white p-5">
            <h3 className="text-base font-bold text-civic-ink">Citizen Controls</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              You can edit or delete your own report only while it is still submitted. Once it is under review, the record is locked for transparency.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
