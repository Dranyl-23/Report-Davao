import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
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
  ReportReviewFlag,
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
  reviewFlag?: ReportReviewFlag;
  assignedLguId?: string;
  assignedDepartment?: string;
  assignedStaff?: string;
  assignedAt?: Timestamp;
  duplicateOfReportId?: string;
  imageUrl?: string;
  imagePublicId?: string;
  moderationReason?: string;
  responseNote?: string;
  slaDueAt?: string;
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
    reviewFlag: data.reviewFlag ?? "active",
    assignedLguId: data.assignedLguId,
    assignedDepartment: data.assignedDepartment,
    assignedStaff: data.assignedStaff,
    assignedAt: data.assignedAt?.toDate().toISOString(),
    duplicateOfReportId: data.duplicateOfReportId,
    imageUrl: data.imageUrl,
    imagePublicId: data.imagePublicId,
    moderationReason: data.moderationReason,
    responseNote: data.responseNote,
    slaDueAt: data.slaDueAt,
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

export function listenToReports(
  onReports: (reports: CivicReport[]) => void,
  onError: (message: string) => void,
  queryLimit = 100,
) {
  const reportsQuery = query(reportsCollection, orderBy("createdAt", "desc"), limit(queryLimit));

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
  const reportRef = doc(reportsCollection);
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

  await setDoc(reportRef, reportData);
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
  await updateReportAdminFields(reportId, { status }, note);
}

export async function updateReportAdminFields(
  reportId: string,
  fields: {
    assignedDepartment?: string;
    assignedLguId?: string;
    assignedStaff?: string;
    duplicateOfReportId?: string;
    moderationReason?: string;
    responseNote?: string;
    reviewFlag?: ReportReviewFlag;
    slaDueAt?: string;
    status?: ReportStatus;
  },
  note?: string,
) {
  const currentUser = getAuth().currentUser;

  if (!currentUser) {
    throw new Error("You must be signed in to update a report.");
  }

  const batch = writeBatch(db);
  const reportUpdate: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (fields.status) {
    reportUpdate.status = fields.status;
  }

  if (fields.reviewFlag) {
    reportUpdate.reviewFlag = fields.reviewFlag;
  }

  if (fields.assignedLguId !== undefined) {
    reportUpdate.assignedLguId = fields.assignedLguId;
  }

  if (fields.assignedDepartment !== undefined) {
    reportUpdate.assignedDepartment = fields.assignedDepartment;
  }

  if (fields.assignedStaff !== undefined) {
    reportUpdate.assignedStaff = fields.assignedStaff;
  }

  if (
    fields.assignedLguId !== undefined ||
    fields.assignedDepartment !== undefined ||
    fields.assignedStaff !== undefined
  ) {
    reportUpdate.assignedAt = serverTimestamp();
  }

  if (fields.duplicateOfReportId !== undefined) {
    reportUpdate.duplicateOfReportId = fields.duplicateOfReportId;
  }

  if (fields.moderationReason !== undefined) {
    reportUpdate.moderationReason = fields.moderationReason;
  }

  if (fields.responseNote !== undefined) {
    reportUpdate.responseNote = fields.responseNote;
  }

  if (fields.slaDueAt !== undefined) {
    reportUpdate.slaDueAt = fields.slaDueAt;
  }

  batch.update(doc(db, "reports", reportId), reportUpdate);

  if (fields.status) {
    const statusLogRef = doc(collection(db, "statusLogs"));
    batch.set(statusLogRef, {
      reportId,
      status: fields.status,
      ...(note ? { note } : {}),
      updatedBy: currentUser.uid,
      createdAt: serverTimestamp(),
    });
  }

  const auditLogRef = doc(collection(db, "auditLogs"));
  batch.set(auditLogRef, {
    action: getReportAuditAction(fields),
    targetType: "report",
    targetId: reportId,
    summary: note ?? getReportAuditSummary(fields),
    actorId: currentUser.uid,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

function getReportAuditAction(fields: Parameters<typeof updateReportAdminFields>[1]) {
  if (fields.status) {
    return "report.statusChanged";
  }

  if (fields.reviewFlag && fields.reviewFlag !== "active") {
    return `report.marked.${fields.reviewFlag}`;
  }

  if (
    fields.assignedLguId !== undefined ||
    fields.assignedDepartment !== undefined ||
    fields.assignedStaff !== undefined
  ) {
    return "report.assigned";
  }

  if (fields.responseNote !== undefined || fields.slaDueAt !== undefined) {
    return "report.responseUpdated";
  }

  return "report.updated";
}

function getReportAuditSummary(fields: Parameters<typeof updateReportAdminFields>[1]) {
  if (fields.status) {
    return `Report status changed to ${fields.status}.`;
  }

  if (fields.reviewFlag && fields.reviewFlag !== "active") {
    return fields.moderationReason
      ? `Report marked ${fields.reviewFlag}. Reason: ${fields.moderationReason}`
      : `Report marked ${fields.reviewFlag}.`;
  }

  if (
    fields.assignedLguId !== undefined ||
    fields.assignedDepartment !== undefined ||
    fields.assignedStaff !== undefined
  ) {
    return "Report assignment updated.";
  }

  if (fields.responseNote !== undefined || fields.slaDueAt !== undefined) {
    return "Report response details updated.";
  }

  return "Report admin fields updated.";
}
