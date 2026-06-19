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

export const davaoResidenceLocalities = {
  "Davao City": [
    "Poblacion",
    "Talomo",
    "Agdao",
    "Buhangin",
    "Bunawan",
    "Paquibato",
    "Toril",
    "Tugbok",
    "Calinan",
    "Baguio",
    "Marilog",
  ],
  "Davao del Sur": [
    "Digos City",
    "Bansalan",
    "Hagonoy",
    "Kiblawan",
    "Magsaysay",
    "Malalag",
    "Matanao",
    "Padada",
    "Santa Cruz",
    "Sulop",
  ],
  "Davao Occidental": [
    "Malita",
    "Don Marcelino",
    "Jose Abad Santos",
    "Santa Maria",
    "Sarangani",
  ],
  "Davao de Oro": [
    "Compostela",
    "Laak",
    "Mabini",
    "Maco",
    "Maragusan",
    "Mawab",
    "Monkayo",
    "Montevista",
    "Nabunturan",
    "New Bataan",
    "Pantukan",
  ],
  "Davao del Norte": [
    "Tagum City",
    "Panabo City",
    "Island Garden City of Samal",
    "Asuncion",
    "Braulio E. Dujali",
    "Carmen",
    "Kapalong",
    "New Corella",
    "San Isidro",
    "Santo Tomas",
    "Talaingod",
  ],
  "Davao Oriental": [
    "Mati City",
    "Baganga",
    "Banaybanay",
    "Boston",
    "Caraga",
    "Cateel",
    "Governor Generoso",
    "Lupon",
    "Manay",
    "San Isidro",
    "Tarragona",
  ],
} satisfies Record<DavaoRegionArea, string[]>;

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
