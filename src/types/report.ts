export type ReportStatus = "submitted" | "under-review" | "in-progress" | "resolved";

export type ReportReviewFlag = "active" | "duplicate" | "spam" | "invalid";

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
  reviewFlag?: ReportReviewFlag;
  assignedLguId?: string;
  assignedDepartment?: string;
  assignedStaff?: string;
  assignedAt?: string;
  duplicateOfReportId?: string;
  imageUrl?: string;
  imagePublicId?: string;
  moderationReason?: string;
  responseNote?: string;
  slaDueAt?: string;
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
  imageUrl?: string;
  imagePublicId?: string;
}

export interface EditableCivicReport {
  title: string;
  category: ReportCategory;
  description: string;
  barangay: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}
