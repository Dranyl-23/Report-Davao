import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";

export const davaoRegionAreas = [
  "Davao City",
  "Davao del Sur",
  "Davao Occidental",
  "Davao de Oro",
  "Davao del Norte",
  "Davao Oriental",
] as const;

export type DavaoRegionArea = (typeof davaoRegionAreas)[number];

export const defaultDavaoCoordinates = {
  lat: 7.0731,
  lng: 125.6128,
};

export const davaoCoordinateBounds = {
  north: 8.15,
  south: 5.2,
  west: 124.9,
  east: 126.75,
};

export function isWithinDavaoCoordinateBounds(coordinates: { lat: number; lng: number }) {
  return (
    coordinates.lat >= davaoCoordinateBounds.south &&
    coordinates.lat <= davaoCoordinateBounds.north &&
    coordinates.lng >= davaoCoordinateBounds.west &&
    coordinates.lng <= davaoCoordinateBounds.east
  );
}

export const davaoRegionBounds: LatLngBoundsExpression = [
  [5.2, 124.9],
  [8.15, 126.75],
];

export const davaoRegionPanBounds: LatLngBoundsExpression = [
  [5.1, 124.8],
  [8.25, 126.85],
];

export const davaoRegionBoundary: LatLngExpression[] = [
  [7.98, 126.30],
  [7.78, 126.55],
  [7.35, 126.67],
  [6.82, 126.55],
  [6.30, 126.30],
  [5.75, 125.95],
  [5.40, 125.58],
  [5.25, 125.38],
  [5.32, 125.10],
  [5.74, 124.88],
  [6.16, 124.90],
  [6.48, 124.96],
  [6.78, 124.88],
  [7.08, 125.04],
  [7.22, 125.02],
  [7.48, 125.10],
  [7.68, 125.30],
  [7.58, 125.48],
  [7.68, 125.58],
  [7.90, 125.85],
  [7.98, 126.30],
];

export const davaoRegionMask: LatLngExpression[][] = [
  [
    [-90, -180],
    [-90, 180],
    [90, 180],
    [90, -180],
  ],
  davaoRegionBoundary,
];

export const davaoDelSurPlaces = [
  { name: "Digos City", coordinates: { lat: 6.7497, lng: 125.3572 } },
  { name: "Bansalan", coordinates: { lat: 6.7861, lng: 125.2139 } },
  { name: "Hagonoy", coordinates: { lat: 6.6833, lng: 125.3250 } },
  { name: "Kiblawan", coordinates: { lat: 6.6167, lng: 125.2167 } },
  { name: "Magsaysay", coordinates: { lat: 6.7667, lng: 125.1500 } },
  { name: "Malalag", coordinates: { lat: 6.5950, lng: 125.3994 } },
  { name: "Matanao", coordinates: { lat: 6.6792, lng: 125.2550 } },
  { name: "Padada", coordinates: { lat: 6.6411, lng: 125.3458 } },
  { name: "Santa Cruz", coordinates: { lat: 6.8364, lng: 125.4131 } },
  { name: "Sulop", coordinates: { lat: 6.5986, lng: 125.3436 } },
];

export const davaoCityDistricts = [
  { name: "Poblacion", coordinates: { lat: 7.0731, lng: 125.6128 } },
  { name: "Talomo", coordinates: { lat: 7.0476, lng: 125.5583 } },
  { name: "Agdao", coordinates: { lat: 7.0926, lng: 125.6297 } },
  { name: "Buhangin", coordinates: { lat: 7.1139, lng: 125.6131 } },
  { name: "Bunawan", coordinates: { lat: 7.2278, lng: 125.6533 } },
  { name: "Paquibato", coordinates: { lat: 7.4200, lng: 125.6800 } },
  { name: "Toril", coordinates: { lat: 7.0183, lng: 125.4967 } },
  { name: "Tugbok", coordinates: { lat: 7.0920, lng: 125.4880 } },
  { name: "Calinan", coordinates: { lat: 7.1900, lng: 125.4550 } },
  { name: "Baguio", coordinates: { lat: 7.2400, lng: 125.3750 } },
  { name: "Marilog", coordinates: { lat: 7.4700, lng: 125.2300 } },
];

export const davaoDelNortePlaces = [
  { name: "Tagum City", coordinates: { lat: 7.4478, lng: 125.8078 } },
  { name: "Panabo City", coordinates: { lat: 7.3081, lng: 125.6842 } },
  { name: "IGACOS", coordinates: { lat: 7.0750, lng: 125.7250 } },
  { name: "Asuncion", coordinates: { lat: 7.5383, lng: 125.7533 } },
  { name: "Braulio E. Dujali", coordinates: { lat: 7.4600, lng: 125.6900 } },
  { name: "Carmen", coordinates: { lat: 7.3600, lng: 125.7050 } },
  { name: "Kapalong", coordinates: { lat: 7.7700, lng: 125.5600 } },
  { name: "New Corella", coordinates: { lat: 7.5867, lng: 125.8233 } },
  { name: "San Isidro", coordinates: { lat: 7.7500, lng: 125.7300 } },
  { name: "Santo Tomas", coordinates: { lat: 7.5333, lng: 125.6239 } },
  { name: "Talaingod", coordinates: { lat: 7.6100, lng: 125.4100 } },
];
