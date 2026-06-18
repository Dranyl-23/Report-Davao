export type ReportStatus = "submitted" | "under-review" | "in-progress" | "resolved";

export type ReportCategory =
  | "pothole"
  | "streetlight"
  | "flooding"
  | "garbage"
  | "drainage"
  | "illegal-dumping"
  | "other";

export interface CivicReport {
  id: string;
  title: string;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  barangay: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  upvotes: number;
  createdAt: string;
  createdBy?: string;
  imageUrl?: string;
}

export interface NewCivicReport {
  title: string;
  category: ReportCategory;
  description: string;
  barangay: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  createdBy: string;
}
