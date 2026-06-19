import { ChangeEvent, useState } from "react";
import { CalendarDays, Camera, CheckCircle2, ClipboardList, Loader2, Mail, PlusCircle, UserCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { ReportCard } from "../components/ReportCard";
import { useReports } from "../hooks/useReports";
import { useAuth } from "../lib/auth";
import { uploadProfileImage, validateReportImage } from "../lib/cloudinary";

function formatProfileDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(date);
}

export function ProfilePage() {
  const { profile, updateProfilePhoto, user } = useAuth();
  const { confirmedReportIds, error, loading, reports, usingSampleData } = useReports(user?.uid);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");
  const submittedReports = reports.filter((report) => report.createdBy === user?.uid);
  const confirmedReports = reports.filter((report) => confirmedReportIds.has(report.id));
  const displayName = profile?.displayName || user?.displayName || "Report Davao Citizen";
  const email = profile?.email || user?.email || "No email available";
  const photoUrl = profile?.photoUrl || user?.photoURL || "";
  const joinedDate = formatProfileDate(user?.metadata.creationTime);

  const stats = [
    {
      label: "Submitted reports",
      value: submittedReports.length,
      icon: ClipboardList,
      tone: "bg-emerald-50 text-civic-green",
    },
    {
      label: "Confirmed reports",
      value: confirmedReportIds.size,
      icon: CheckCircle2,
      tone: "bg-blue-50 text-civic-blue",
    },
  ];

  async function handleProfilePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const validationMessage = validateReportImage(file);

    if (validationMessage) {
      setPhotoMessage(validationMessage);
      return;
    }

    setUploadingPhoto(true);
    setPhotoMessage("Uploading profile picture...");

    try {
      const uploadedImage = await uploadProfileImage(file);
      await updateProfilePhoto(uploadedImage.imageUrl, uploadedImage.imagePublicId);
      setPhotoMessage("Profile picture updated.");
    } catch (photoError) {
      setPhotoMessage(photoError instanceof Error ? photoError.message : "Profile picture upload failed.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-civic-line bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col items-start gap-2">
              <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-civic-line bg-emerald-50 text-civic-green">
                {photoUrl ? (
                  <img src={photoUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserCircle size={42} aria-hidden="true" />
                  </div>
                )}
                {uploadingPhoto ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                    <Loader2 className="h-6 w-6 animate-spin text-civic-green" aria-hidden="true" />
                  </div>
                ) : null}
              </div>
              <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-civic-line bg-civic-field px-3 text-xs font-bold text-civic-ink hover:bg-white">
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploadingPhoto}
                  onChange={handleProfilePhotoChange}
                  type="file"
                />
                <Camera size={15} aria-hidden="true" />
                {photoUrl ? "Change photo" : "Add photo"}
              </label>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-civic-ink">{displayName}</h2>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Mail size={16} aria-hidden="true" />
                <span className="break-all">{email}</span>
              </p>
              <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <CalendarDays size={14} aria-hidden="true" />
                Joined {joinedDate}
              </p>
              {photoMessage ? (
                <p className="mt-3 rounded-lg bg-civic-field px-3 py-2 text-xs font-semibold text-slate-600">
                  {photoMessage}
                </p>
              ) : null}
            </div>
          </div>
          <Link
            to="/submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-civic-green px-4 text-sm font-bold text-white hover:bg-emerald-800"
          >
            <PlusCircle size={18} aria-hidden="true" />
            Submit Report
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div key={stat.label} className="rounded-lg border border-civic-line bg-white p-5">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${stat.tone}`}>
                <Icon size={22} aria-hidden="true" />
              </div>
              <p className="mt-4 text-3xl font-bold text-civic-ink">{stat.value}</p>
              <p className="text-sm font-semibold text-slate-600">{stat.label}</p>
            </div>
          );
        })}
      </section>

      {loading ? (
        <p className="rounded-lg border border-civic-line bg-white p-4 text-sm font-semibold text-slate-600">
          Loading profile activity...
        </p>
      ) : null}

      {error ? <p className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-civic-red">{error}</p> : null}

      {usingSampleData ? (
        <p className="rounded-lg bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          Your live activity will appear here once reports are available.
        </p>
      ) : null}

      <section className="rounded-lg border border-civic-line bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-civic-ink">Recent Submitted Reports</h3>
            <p className="text-sm text-slate-600">Your submitted reports are listed here for quick tracking.</p>
          </div>
          <Link to="/my-reports" className="text-sm font-bold text-civic-green hover:text-emerald-800">
            View all
          </Link>
        </div>
        {submittedReports.length > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {submittedReports.slice(0, 4).map((report) => (
              <ReportCard key={report.id} report={report} showConfirmAction={false} />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-civic-field p-4 text-sm font-semibold text-slate-600">
            You have not submitted a report yet.
          </p>
        )}
      </section>

      {confirmedReports.length > 0 ? (
        <section className="rounded-lg border border-civic-line bg-white p-5">
          <h3 className="text-lg font-bold text-civic-ink">Recently Confirmed</h3>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {confirmedReports.slice(0, 4).map((report) => (
              <ReportCard key={report.id} report={report} showConfirmAction={false} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
