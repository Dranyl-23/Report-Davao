import { useEffect, useState } from "react";
import { Icon } from "leaflet";
import { Map as MapIcon, Mountain, Satellite } from "lucide-react";
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
  onLocationPicked: (coordinates: Coordinates) => void;
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

function PickReportLocation({ onLocationPicked }: Pick<LocationPreviewMapProps, "onLocationPicked">) {
  useMapEvents({
    click(event) {
      onLocationPicked({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

export function LocationPreviewMap({
  accuracyMeters,
  coordinates,
  hasPinnedLocation,
  onLocationPicked,
}: LocationPreviewMapProps) {
  const [activeLayer, setActiveLayer] = useState<PreviewMapLayer>("satellite");
  const tileLayer = previewMapLayers[activeLayer];
  const shouldShowAccuracyCircle = hasPinnedLocation && accuracyMeters !== null && Number.isFinite(accuracyMeters);

  return (
    <div className="relative h-72 overflow-hidden rounded-lg border border-civic-line">
      <MapContainer
        center={[defaultDavaoCoordinates.lat, defaultDavaoCoordinates.lng]}
        className="h-full"
        maxBounds={davaoRegionPanBounds}
        maxBoundsViscosity={1}
        minZoom={7}
        scrollWheelZoom
        zoom={10}
      >
        <TileLayer key={activeLayer} attribution={tileLayer.attribution} url={tileLayer.url} />
        <SyncMapView coordinates={coordinates} hasPinnedLocation={hasPinnedLocation} />
        <PickReportLocation onLocationPicked={onLocationPicked} />
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
      <div className="absolute right-3 top-3 z-[500] rounded-lg border border-civic-line bg-white/95 p-1.5 shadow-sm">
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
                className={`flex h-12 w-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-md border text-[11px] font-bold transition ${
                  isActive
                    ? "border-civic-green bg-civic-green text-white"
                    : "border-transparent bg-civic-field text-slate-700 hover:border-civic-line hover:bg-white"
                }`}
                onClick={() => setActiveLayer(layer)}
              >
                <LayerIcon className="h-4 w-4" aria-hidden="true" />
                <span>{layerConfig.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {!hasPinnedLocation ? (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[500] rounded-lg border border-civic-line bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
          Use GPS or click the map to place the report pin.
        </div>
      ) : null}
    </div>
  );
}
