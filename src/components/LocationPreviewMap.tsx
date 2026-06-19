import { useEffect, useState } from "react";
import { Icon } from "leaflet";
import { Expand, Map as MapIcon, Mountain, Satellite, X } from "lucide-react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { davaoRegionPanBounds, defaultDavaoCoordinates } from "../data/davaoRegion";

const previewMarkerIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationPreviewMapProps {
  coordinates: Coordinates;
  accuracyMeters: number | null;
  hasPinnedLocation: boolean;
  onLocationPicked?: (coordinates: Coordinates) => void;
  readOnly?: boolean;
}

type PreviewMapLayer = "street" | "satellite" | "terrain";

const previewMapLayers = {
  street: {
    label: "Street",
    icon: MapIcon,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  },
  satellite: {
    label: "Satellite",
    icon: Satellite,
    attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  },
  terrain: {
    label: "Terrain",
    icon: Mountain,
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | Map style &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  },
} satisfies Record<
  PreviewMapLayer,
  { label: string; icon: typeof MapIcon; attribution: string; url: string }
>;

function SyncMapView({ coordinates, hasPinnedLocation }: Pick<LocationPreviewMapProps, "coordinates" | "hasPinnedLocation">) {
  const map = useMap();

  useEffect(() => {
    map.setView([coordinates.lat, coordinates.lng], hasPinnedLocation ? 17 : 10, {
      animate: true,
    });
  }, [coordinates, hasPinnedLocation, map]);

  return null;
}

function PickReportLocation({
  onLocationPicked,
  readOnly = false,
}: Pick<LocationPreviewMapProps, "onLocationPicked" | "readOnly">) {
  useMapEvents({
    click(event) {
      if (readOnly || !onLocationPicked) {
        return;
      }

      onLocationPicked({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

function ResizeMapOnMount({ watchKey }: { watchKey: unknown }) {
  const map = useMap();

  useEffect(() => {
    const resizeId = window.setTimeout(() => {
      map.invalidateSize();
    }, 80);

    return () => window.clearTimeout(resizeId);
  }, [map, watchKey]);

  return null;
}

interface MapLayerControlProps {
  activeLayer: PreviewMapLayer;
  onLayerChange: (layer: PreviewMapLayer) => void;
  compact?: boolean;
}

function MapLayerControl({ activeLayer, compact = false, onLayerChange }: MapLayerControlProps) {
  return (
    <div className="rounded-lg border border-civic-line bg-white/95 p-1.5 shadow-sm">
      <div className="grid grid-cols-3 gap-1" aria-label="Location map view options">
        {(Object.keys(previewMapLayers) as PreviewMapLayer[]).map((layer) => {
          const layerConfig = previewMapLayers[layer];
          const LayerIcon = layerConfig.icon;
          const isActive = layer === activeLayer;

          return (
            <button
              key={layer}
              type="button"
              aria-pressed={isActive}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-md border text-[11px] font-bold transition ${
                compact ? "h-11 w-[4.2rem]" : "h-12 w-[4.5rem]"
              } ${
                isActive
                  ? "border-civic-green bg-civic-green text-white"
                  : "border-transparent bg-civic-field text-slate-700 hover:border-civic-line hover:bg-white"
              }`}
              onClick={() => onLayerChange(layer)}
            >
              <LayerIcon className="h-4 w-4" aria-hidden="true" />
              <span>{layerConfig.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface LocationMapCanvasProps extends LocationPreviewMapProps {
  activeLayer: PreviewMapLayer;
  onLayerChange: (layer: PreviewMapLayer) => void;
  fullScreen?: boolean;
}

function LocationMapCanvas({
  accuracyMeters,
  activeLayer,
  coordinates,
  fullScreen = false,
  hasPinnedLocation,
  onLayerChange,
  onLocationPicked,
  readOnly = false,
}: LocationMapCanvasProps) {
  const tileLayer = previewMapLayers[activeLayer];
  const shouldShowAccuracyCircle = hasPinnedLocation && accuracyMeters !== null && Number.isFinite(accuracyMeters);

  return (
    <>
      <MapContainer
        center={[defaultDavaoCoordinates.lat, defaultDavaoCoordinates.lng]}
        className="h-full w-full"
        maxBounds={davaoRegionPanBounds}
        maxBoundsViscosity={1}
        minZoom={7}
        scrollWheelZoom
        zoom={10}
      >
        <TileLayer key={activeLayer} attribution={tileLayer.attribution} url={tileLayer.url} />
        <ResizeMapOnMount watchKey={`${activeLayer}-${fullScreen}`} />
        <SyncMapView coordinates={coordinates} hasPinnedLocation={hasPinnedLocation} />
        <PickReportLocation onLocationPicked={onLocationPicked} readOnly={readOnly} />
        {hasPinnedLocation ? (
          <>
            {shouldShowAccuracyCircle ? (
              <Circle
                center={[coordinates.lat, coordinates.lng]}
                pathOptions={{
                  color: "#1f8a5b",
                  fillColor: "#1f8a5b",
                  fillOpacity: 0.12,
                  opacity: 0.45,
                  weight: 1,
                }}
                radius={accuracyMeters}
              />
            ) : null}
            <Marker position={[coordinates.lat, coordinates.lng]} icon={previewMarkerIcon}>
              <Popup>Report pin location</Popup>
            </Marker>
          </>
        ) : null}
      </MapContainer>
      <div className="absolute right-3 top-3 z-[500]">
        <MapLayerControl activeLayer={activeLayer} compact={fullScreen} onLayerChange={onLayerChange} />
      </div>
      {!hasPinnedLocation ? (
        <div
          className={`pointer-events-none absolute bottom-3 left-3 right-3 z-[500] rounded-lg border border-civic-line bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ${
            onLocationPicked && !readOnly ? "pr-36 sm:pr-3" : ""
          }`}
        >
          Use GPS or tap the map to place the report pin.
        </div>
      ) : readOnly ? (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[500] rounded-lg border border-civic-line bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
          Report pin location
        </div>
      ) : null}
    </>
  );
}

export function LocationPreviewMap({
  accuracyMeters,
  coordinates,
  hasPinnedLocation,
  onLocationPicked,
  readOnly = false,
}: LocationPreviewMapProps) {
  const [activeLayer, setActiveLayer] = useState<PreviewMapLayer>("satellite");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const canPickLocation = Boolean(onLocationPicked && !readOnly);

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPickerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPickerOpen]);

  return (
    <div className="relative h-72 overflow-hidden rounded-lg border border-civic-line">
      <LocationMapCanvas
        accuracyMeters={accuracyMeters}
        activeLayer={activeLayer}
        coordinates={coordinates}
        hasPinnedLocation={hasPinnedLocation}
        onLayerChange={setActiveLayer}
        onLocationPicked={onLocationPicked}
        readOnly={readOnly}
      />

      {canPickLocation ? (
        <button
          type="button"
          className="absolute bottom-3 right-3 z-[520] inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-civic-green px-3 text-xs font-bold text-white shadow-sm sm:hidden"
          onClick={() => setIsPickerOpen(true)}
        >
          <Expand size={16} aria-hidden="true" />
          Open full map
        </button>
      ) : null}

      {isPickerOpen ? (
        <div className="fixed inset-0 z-[1000] flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-civic-line bg-white px-4 py-3">
            <div>
              <h2 className="text-base font-bold text-civic-ink">Pick report location</h2>
              <p className="text-xs font-semibold text-slate-500">Tap the exact spot, then use this pin.</p>
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-civic-line bg-civic-field text-civic-ink"
              onClick={() => setIsPickerOpen(false)}
              aria-label="Close full-screen map picker"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </div>

          <div className="relative min-h-0 flex-1">
            <LocationMapCanvas
              accuracyMeters={accuracyMeters}
              activeLayer={activeLayer}
              coordinates={coordinates}
              fullScreen
              hasPinnedLocation={hasPinnedLocation}
              onLayerChange={setActiveLayer}
              onLocationPicked={onLocationPicked}
              readOnly={readOnly}
            />
          </div>

          <div className="border-t border-civic-line bg-white p-3">
            <div className="mb-3 rounded-lg bg-civic-field px-3 py-2 text-xs font-semibold text-slate-600">
              {hasPinnedLocation
                ? `Pinned at ${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`
                : "Tap the map to place a pin before closing."}
            </div>
            <button
              type="button"
              className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-civic-green px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!hasPinnedLocation}
              onClick={() => setIsPickerOpen(false)}
            >
              Use this pin
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
