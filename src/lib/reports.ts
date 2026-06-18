import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { CivicReport, NewCivicReport, ReportCategory, ReportStatus } from "../types/report";

interface FirestoreReport {
  title?: string;
  category?: ReportCategory;
  description?: string;
  status?: ReportStatus;
  barangay?: string;
  latitude?: number;
  longitude?: number;
  upvotes?: number;
  createdAt?: Timestamp;
  createdBy?: string;
  imageUrl?: string;
}

export interface ReportConfirmation {
  id: string;
  reportId: string;
  userId: string;
  createdAt?: string;
}

interface FirestoreConfirmation {
  reportId?: string;
  userId?: string;
  createdAt?: Timestamp;
}

const reportsCollection = collection(db, "reports");
const confirmationsCollection = collection(db, "upvotes");

function toCivicReport(id: string, data: FirestoreReport): CivicReport {
  return {
    id,
    title: data.title ?? "Untitled report",
    category: data.category ?? "other",
    description: data.description ?? "",
    status: data.status ?? "submitted",
    barangay: data.barangay ?? "Unspecified area",
    coordinates: {
      lat: data.latitude ?? 7.0731,
      lng: data.longitude ?? 125.6128,
    },
    upvotes: data.upvotes ?? 0,
    createdAt: data.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
    createdBy: data.createdBy,
    imageUrl: data.imageUrl,
  };
}

function toReportConfirmation(id: string, data: FirestoreConfirmation): ReportConfirmation | null {
  if (!data.reportId || !data.userId) {
    return null;
  }

  return {
    id,
    reportId: data.reportId,
    userId: data.userId,
    createdAt: data.createdAt?.toDate().toISOString(),
  };
}

export function listenToReports(onReports: (reports: CivicReport[]) => void, onError: (message: string) => void) {
  const reportsQuery = query(reportsCollection, orderBy("createdAt", "desc"));

  return onSnapshot(
    reportsQuery,
    (snapshot) => {
      const reports = snapshot.docs.map((reportDoc) =>
        toCivicReport(reportDoc.id, reportDoc.data() as FirestoreReport),
      );
      onReports(reports);
    },
    (error) => {
      onError(error.message);
    },
  );
}

export function listenToConfirmations(
  onConfirmations: (confirmations: ReportConfirmation[]) => void,
  onError: (message: string) => void,
) {
  return onSnapshot(
    confirmationsCollection,
    (snapshot) => {
      const confirmations = snapshot.docs
        .map((confirmationDoc) =>
          toReportConfirmation(confirmationDoc.id, confirmationDoc.data() as FirestoreConfirmation),
        )
        .filter((confirmation): confirmation is ReportConfirmation => confirmation !== null);
      onConfirmations(confirmations);
    },
    (error) => {
      onError(error.message);
    },
  );
}

export async function createReport(report: NewCivicReport) {
  await addDoc(reportsCollection, {
    title: report.title.trim(),
    category: report.category,
    description: report.description.trim(),
    barangay: report.barangay.trim(),
    latitude: report.coordinates.lat,
    longitude: report.coordinates.lng,
    status: "submitted",
    upvotes: 0,
    createdBy: report.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function confirmReport(reportId: string, userId: string) {
  const confirmationRef = doc(db, "upvotes", `${reportId}_${userId}`);
  const existingConfirmation = await getDoc(confirmationRef);

  if (existingConfirmation.exists()) {
    return;
  }

  await setDoc(confirmationRef, {
    reportId,
    userId,
    createdAt: serverTimestamp(),
  });
}

export async function updateReportStatus(reportId: string, status: ReportStatus) {
  await updateDoc(doc(db, "reports", reportId), {
    status,
    updatedAt: serverTimestamp(),
  });
}
