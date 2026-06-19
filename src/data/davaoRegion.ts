import type { LatLngBoundsExpression } from "leaflet";

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
