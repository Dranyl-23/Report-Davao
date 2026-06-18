import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Camera, LocateFixed, MapPin, Send, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  davaoRegionAreas,
  defaultDavaoCoordinates,
  isWithinDavaoCoordinateBounds,
} from "../data/davaoRegion";
import { LocationPreviewMap } from "../components/LocationPreviewMap";
import { createReport } from "../lib/reports";
import { useAuth } from "../lib/auth";
import { uploadReportImage, validateReportImage } from "../lib/cloudinary";
import type { ReportCategory } from "../types/report";

const excellentGpsAccuracyMeters = 25;
const gpsSearchTimeoutMs = 18000;

function formatAccuracy(meters: number | null) {
  if (meters === null || !Number.isFinite(meters)) {
    return "manual pin";
  }

  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }

  return `${Math.round(meters)} m`;
}

function toCoordinates(position: GeolocationPosition) {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };
}

export function SubmitReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ReportCategory>("pothole");
  const [area, setArea] = useState("Davao City");
  const [description, setDescription] = useState("");
  const [coordinates, setCoordinates] = useState(defaultDavaoCoordinates);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [hasPinnedLocation, setHasPinnedLocation] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  function handleLocationPicked(
    nextCoordinates: { lat: number; lng: number },
    source: "gps" | "map",
    accuracyMeters: number | null = null,
  ) {
    if (!isWithinDavaoCoordinateBounds(nextCoordinates)) {
      setMessage("Selected location is outside the Davao Region coverage. Please choose a point inside Region XI.");
      return false;
    }

    setCoordinates(nextCoordinates);
    setLocationAccuracy(accuracyMeters);
    setHasPinnedLocation(true);
    setMessage(
      source === "gps"
        ? `Best GPS location captured. Estimated accuracy is +/-${formatAccuracy(accuracyMeters)}. You can click the map to fine tune.`
        : "Report pin updated from the map.",
    );
    return true;
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const validationMessage = validateReportImage(file);

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setMessage("Photo attached. It will upload when you submit the report.");
  }

  function removePhoto() {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(null);
    setImagePreviewUrl("");
    setMessage("Photo removed.");
  }

  function handleUseGps() {
    setMessage("");

    if (!navigator.geolocation) {
      setMessage("GPS is not available in this browser. Click the map preview to place the report pin.");
      return;
    }

    setLocating(true);
    setMessage("Finding your best GPS location. Keep location services on and wait a few seconds.");

    let bestPosition: GeolocationPosition | null = null;
    let finished = false;
    let watchId: number | null = null;

    const finishGpsSearch = (position: GeolocationPosition | null, fallbackMessage?: string) => {
      if (finished) {
        return;
      }

      finished = true;

      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }

      setLocating(false);

      if (!position) {
        setMessage(fallbackMessage ?? "GPS could not find your location. Click the map preview to place the report pin.");
        return;
      }

      handleLocationPicked(toCoordinates(position), "gps", position.coords.accuracy);
    };

    const searchTimeout = window.setTimeout(() => {
      finishGpsSearch(bestPosition);
    }, gpsSearchTimeoutMs);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (finished) {
          return;
        }

        const nextCoordinates = toCoordinates(position);

        if (!isWithinDavaoCoordinateBounds(nextCoordinates)) {
          setMessage("GPS detected a location outside Davao Region. Click the satellite map to place the pin manually.");
          return;
        }

        if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
          setCoordinates(nextCoordinates);
          setLocationAccuracy(position.coords.accuracy);
          setHasPinnedLocation(true);
          setMessage(`Improving GPS accuracy... best so far is +/-${formatAccuracy(position.coords.accuracy)}.`);
        }

        if (position.coords.accuracy <= excellentGpsAccuracyMeters) {
          window.clearTimeout(searchTimeout);
          finishGpsSearch(position);
        }
      },
      (error) => {
        window.clearTimeout(searchTimeout);
        finishGpsSearch(
          bestPosition,
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Allow precise location in your browser, or click the map preview to place the pin."
            : "GPS is unavailable right now. Click the map preview to place the report pin.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: gpsSearchTimeoutMs },
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const selectedArea = area.trim();
    const trimmedDescription = description.trim();

    if (!user) {
      setMessage("Please sign in first.");
      return;
    }

    if (!hasPinnedLocation) {
      setMessage("Please capture GPS or click the map preview to place the report pin before submitting.");
      return;
    }

    if (!isWithinDavaoCoordinateBounds(coordinates)) {
      setMessage("Report location must be inside Davao Region coverage.");
      return;
    }

    if (trimmedTitle.length < 5 || trimmedDescription.length < 10) {
      setMessage("Please provide a clearer title and description before submitting.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      let uploadedImage: { imageUrl: string; imagePublicId: string } | null = null;

      if (imageFile) {
        setMessage("Uploading photo to Cloudinary...");
        uploadedImage = await uploadReportImage(imageFile);
      }

      await createReport({
        title: trimmedTitle,
        category,
        description: trimmedDescription,
        barangay: selectedArea,
        coordinates,
        createdBy: user.uid,
        imageUrl: uploadedImage?.imageUrl,
        imagePublicId: uploadedImage?.imagePublicId,
      });
      navigate("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Report submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-lg border border-civic-line bg-white p-5">
        <h2 className="text-xl font-bold text-civic-ink">Submit Report</h2>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Report title</span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-civic-line bg-white px-3 text-sm outline-none focus:border-civic-green focus:ring-2 focus:ring-emerald-100"
              placeholder="Example: Broken streetlight near crossing"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Category</span>
            <select
              className="mt-2 h-11 w-full rounded-lg border border-civic-line bg-white px-3 text-sm outline-none focus:border-civic-green focus:ring-2 focus:ring-emerald-100"
              value={category}
              onChange={(event) => setCategory(event.target.value as ReportCategory)}
            >
              <option value="pothole">Pothole</option>
              <option value="streetlight">Broken streetlight</option>
              <option value="flooding">Flooding</option>
              <option value="garbage">Garbage</option>
              <option value="drainage">Drainage</option>
              <option value="illegal-dumping">Illegal dumping</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Coverage Area</span>
            <select
              className="mt-2 h-11 w-full rounded-lg border border-civic-line bg-white px-3 text-sm outline-none focus:border-civic-green focus:ring-2 focus:ring-emerald-100"
              value={area}
              onChange={(event) => setArea(event.target.value)}
            >
              {davaoRegionAreas.map((regionArea) => (
                <option key={regionArea} value={regionArea}>
                  {regionArea}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Description</span>
            <textarea
              className="mt-2 min-h-28 w-full resize-y rounded-lg border border-civic-line bg-white px-3 py-3 text-sm outline-none focus:border-civic-green focus:ring-2 focus:ring-emerald-100"
              placeholder="Briefly describe the issue"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-civic-line bg-civic-field px-4 text-sm font-semibold text-civic-ink hover:bg-white"
              title="Attach a JPG, PNG, or WebP photo up to 5 MB."
            >
              <input
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handlePhotoChange}
                type="file"
              />
              <Camera size={18} aria-hidden="true" />
              {imageFile ? "Change Photo" : "Upload Photo"}
            </label>
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-civic-line bg-civic-field px-4 text-sm font-semibold text-civic-ink"
              onClick={handleUseGps}
              disabled={locating}
            >
              <LocateFixed size={18} aria-hidden="true" />
              {locating ? "Locating..." : "Use My GPS"}
            </button>
          </div>

          <div
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              hasPinnedLocation ? "bg-emerald-50 text-emerald-800" : "bg-civic-field text-slate-600"
            }`}
          >
            {hasPinnedLocation
              ? `Pinned at Lat ${coordinates.lat.toFixed(5)}, Lng ${coordinates.lng.toFixed(5)} ${
                  locationAccuracy !== null ? `(accuracy +/-${formatAccuracy(locationAccuracy)})` : "(manual pin)"
                }`
              : "Location pin required before submission."}
          </div>

          {message ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{message}</p> : null}

          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-civic-green px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting || locating || !hasPinnedLocation}
          >
            <Send size={18} aria-hidden="true" />
            {submitting
              ? "Submitting..."
              : locating
                ? "Improving GPS..."
                : hasPinnedLocation
                  ? "Submit Report"
                  : "Pin Location First"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-civic-line bg-white p-5">
        <h2 className="text-xl font-bold text-civic-ink">Report Preview</h2>
        <div className="mt-5 space-y-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-civic-ink">
              <MapPin size={18} aria-hidden="true" />
              Location Pin
            </div>
            <LocationPreviewMap
              accuracyMeters={locationAccuracy}
              coordinates={coordinates}
              hasPinnedLocation={hasPinnedLocation}
              onLocationPicked={(nextCoordinates) => handleLocationPicked(nextCoordinates, "map")}
            />
          </div>

          <div className="rounded-lg border border-dashed border-civic-line bg-civic-field p-5">
            <div className="flex aspect-video items-center justify-center rounded-lg bg-white text-sm font-semibold text-slate-500">
              {imagePreviewUrl ? (
                <div className="relative h-full w-full">
                  <img
                    src={imagePreviewUrl}
                    alt="Selected report evidence"
                    className="h-full w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-civic-ink shadow-sm hover:bg-red-50 hover:text-civic-red"
                    onClick={removePhoto}
                    aria-label="Remove selected photo"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                "Photo upload optional"
              )}
            </div>
            <div className="mt-4 space-y-3">
              <h3 className="text-lg font-bold text-civic-ink">{title || "Report title"}</h3>
              <p className="text-sm leading-6 text-slate-600">{description || "Report description will preview here."}</p>
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-md bg-white px-2 py-1">{area}</span>
                <span className="rounded-md bg-white px-2 py-1">{category}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
