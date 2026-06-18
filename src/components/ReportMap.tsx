import { useState } from "react";
import { Icon } from "leaflet";
import { Map as MapIcon, Mountain, Satellite } from "lucide-react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import {
  davaoRegionAreas,
  davaoRegionBounds,
  davaoRegionPanBounds,
} from "../data/davaoRegion";
import type { CivicReport } from "../types/report";
import { StatusBadge } from "./StatusBadge";

const markerIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type MapLayer = "street" | "satellite" | "terrain";

const mapLayers = {
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
} satisfies Record<MapLayer, { label: string; icon: typeof MapIcon; attribution: string; url: string }>;

interface ReportMapProps {
  reports: CivicReport[];
}

function CustomZoomControl() {
  const map = useMap();

  return (
    <div className="absolute bottom-3 left-3 z-[500] overflow-hidden rounded-lg border border-civic-line bg-white shadow-sm">
      <button
        aria-label="Zoom in"
        className="flex h-10 w-10 items-center justify-center border-b border-civic-line text-2xl font-bold text-civic-ink hover:bg-civic-field"
        onClick={() => map.zoomIn()}
        type="button"
      >
        +
      </button>
      <button
        aria-label="Zoom out"
        className="flex h-10 w-10 items-center justify-center text-2xl font-normal text-slate-500 hover:bg-civic-field"
        onClick={() => map.zoomOut()}
        type="button"
      >
        -
      </button>
    </div>
  );
}

export function ReportMap({ reports }: ReportMapProps) {
  const [activeLayer, setActiveLayer] = useState<MapLayer>("street");
  const tileLayer = mapLayers[activeLayer];

  return (
    <div className="relative h-full min-h-[540px] overflow-hidden rounded-lg">
      <MapContainer
        bounds={davaoRegionBounds}
        boundsOptions={{ padding: [24, 24] }}
        className="h-full rounded-lg"
        maxBounds={davaoRegionPanBounds}
        maxBoundsViscosity={1}
        minZoom={7}
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer key={activeLayer} attribution={tileLayer.attribution} url={tileLayer.url} />
        <CustomZoomControl />

        {reports.map((report) => (
          <Marker key={report.id} position={[report.coordinates.lat, report.coordinates.lng]} icon={markerIcon}>
            <Popup>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-civic-ink">{report.title}</p>
                <StatusBadge status={report.status} />
                <p className="text-xs text-slate-600">{report.barangay}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 z-[500] max-w-[calc(100%-1.5rem)] rounded-lg border border-civic-line bg-white/95 p-3 shadow-sm sm:max-w-sm">
        <p className="text-xs font-bold uppercase text-civic-green">Report Davao coverage</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">{davaoRegionAreas.join(" | ")}</p>
      </div>

      <div className="absolute right-3 top-3 z-[500] rounded-lg border border-civic-line bg-white/95 p-2 shadow-sm max-md:bottom-3 max-md:left-16 max-md:right-3 max-md:top-auto">
        <div className="grid grid-cols-3 gap-2" aria-label="Map view options">
          {(Object.keys(mapLayers) as MapLayer[]).map((layer) => {
            const layerConfig = mapLayers[layer];
            const LayerIcon = layerConfig.icon;
            const isActive = layer === activeLayer;

            return (
              <button
                key={layer}
                type="button"
                aria-pressed={isActive}
                className={`flex h-16 w-20 flex-col items-center justify-center gap-1 rounded-lg border text-xs font-bold transition ${
                  isActive
                    ? "border-civic-green bg-civic-green text-white"
                    : "border-transparent bg-civic-field text-slate-700 hover:border-civic-line hover:bg-white"
                }`}
                onClick={() => setActiveLayer(layer)}
              >
                <LayerIcon className="h-5 w-5" aria-hidden="true" />
                <span>{layerConfig.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
