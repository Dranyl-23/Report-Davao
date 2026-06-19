import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "./firebase";
import type {
  CivicReport,
  EditableCivicReport,
  NewCivicReport,
  ReportCategory,
  ReportStatus,
} from "../types/report";

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
  imagePublicId?: string;
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
    imagePublicId: data.imagePublicId,
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
  userId: string,
  onConfirmations: (confirmations: ReportConfirmation[]) => void,
  onError: (message: string) => void,
) {
  const confirmationsQuery = query(confirmationsCollection, where("userId", "==", userId));

  return onSnapshot(
    confirmationsQuery,
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
  const reportData: Record<string, unknown> = {
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
  };

  if (report.imageUrl) {
    reportData.imageUrl = report.imageUrl;
  }

  if (report.imagePublicId) {
    reportData.imagePublicId = report.imagePublicId;
  }

  await addDoc(reportsCollection, reportData);
}

export async function confirmReport(reportId: string, userId: string) {
  const reportRef = doc(db, "reports", reportId);
  const confirmationRef = doc(db, "upvotes", `${reportId}_${userId}`);

  await runTransaction(db, async (transaction) => {
    const existingConfirmation = await transaction.get(confirmationRef);

    if (existingConfirmation.exists()) {
      return;
    }

    const reportSnap = await transaction.get(reportRef);

    if (!reportSnap.exists()) {
      throw new Error("Report no longer exists.");
    }

    const reportData = reportSnap.data() as FirestoreReport;

    if (reportData.createdBy === userId) {
      throw new Error("You cannot confirm your own report.");
    }

    transaction.set(confirmationRef, {
      reportId,
      userId,
      createdAt: serverTimestamp(),
    });

    transaction.update(reportRef, {
      upvotes: (reportData.upvotes ?? 0) + 1,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function updateCitizenReport(reportId: string, report: EditableCivicReport) {
  await updateDoc(doc(db, "reports", reportId), {
    title: report.title.trim(),
    category: report.category,
    description: report.description.trim(),
    barangay: report.barangay.trim(),
    latitude: report.coordinates.lat,
    longitude: report.coordinates.lng,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCitizenReport(reportId: string) {
  await deleteDoc(doc(db, "reports", reportId));
}

export async function updateReportStatus(reportId: string, status: ReportStatus, note?: string) {
  const currentUser = getAuth().currentUser;

  if (!currentUser) {
    throw new Error("You must be signed in to update a report status.");
  }

  const batch = writeBatch(db);

  // Update the report status
  batch.update(doc(db, "reports", reportId), {
    status,
    updatedAt: serverTimestamp(),
  });

  // Atomically create an audit log entry in statusLogs
  const logRef = doc(collection(db, "statusLogs"));
  batch.set(logRef, {
    reportId,
    status,
    ...(note ? { note } : {}),
    updatedBy: currentUser.uid,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}
