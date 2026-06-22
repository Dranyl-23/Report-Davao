import { getAuth } from "firebase/auth";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { UserProfile, UserRole } from "./auth";
import type { ReportReviewFlag } from "../types/report";

export type LguPlan = "free-pilot" | "basic" | "pro" | "premium";
export type LguStatus = "pilot" | "active" | "paused";

export interface AdminUserProfile extends UserProfile {
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminConfirmation {
  id: string;
  reportId: string;
  userId: string;
  createdAt?: string;
}

export interface ReportAdminDetails {
  id: string;
  assignedAt?: string;
  assignedDepartment?: string;
  assignedLguId?: string;
  assignedStaff?: string;
  duplicateOfReportId?: string;
  moderationReason?: string;
  responseNote?: string;
  reviewFlag?: ReportReviewFlag;
  slaDueAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface LguAccount {
  id: string;
  adminEmail: string;
  area: string;
  createdAt?: string;
  name: string;
  plan: LguPlan;
  status: LguStatus;
  updatedAt?: string;
}

export interface LguAccountDraft {
  adminEmail: string;
  area: string;
  name: string;
  plan: LguPlan;
  status: LguStatus;
}

export interface AuditLog {
  id: string;
  action: string;
  actorId: string;
  createdAt?: string;
  summary: string;
  targetId: string;
  targetType: string;
}

export interface SystemSettings {
  allowedImageTypes: string[];
  blockedWords: string[];
  duplicateRadiusMeters: number;
  maintenanceMode: boolean;
  maxImageSizeMb: number;
  reportLimitPerDay: number;
  reportLimitPerHour: number;
  pwaInstallPrompt: boolean;
}

export interface WorkflowSettings {
  rejectionReasons: string[];
}

const defaultSystemSettings: SystemSettings = {
  allowedImageTypes: ["image/jpeg", "image/png", "image/webp"],
  blockedWords: [],
  duplicateRadiusMeters: 150,
  maintenanceMode: false,
  maxImageSizeMb: 5,
  reportLimitPerDay: 20,
  reportLimitPerHour: 5,
  pwaInstallPrompt: true,
};

const defaultWorkflowSettings: WorkflowSettings = {
  rejectionReasons: ["Duplicate report", "Invalid location", "Insufficient details", "Spam or abusive content"],
};

function timestampToIso(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  return value instanceof Timestamp ? value.toDate().toISOString() : undefined;
}

function requireActorId() {
  const currentUser = getAuth().currentUser;

  if (!currentUser) {
    throw new Error("Please sign in with the super admin account first.");
  }

  return currentUser.uid;
}

function toAdminUserProfile(uid: string, data: Partial<AdminUserProfile>): AdminUserProfile {
  return {
    uid,
    email: data.email ?? null,
    displayName: data.displayName ?? null,
    role: data.role ?? "citizen",
    photoUrl: data.photoUrl,
    photoPublicId: data.photoPublicId,
    residenceArea: data.residenceArea,
    residenceDistrict: data.residenceDistrict,
    residenceBarangay: data.residenceBarangay,
    assignedArea: data.assignedArea,
    assignedDepartment: data.assignedDepartment,
    disabled: data.disabled === true,
    disableReason: data.disableReason,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

function toAdminConfirmation(id: string, data: Partial<AdminConfirmation> & { createdAt?: Timestamp }): AdminConfirmation | null {
  if (!data.reportId || !data.userId) {
    return null;
  }

  return {
    id,
    reportId: data.reportId,
    userId: data.userId,
    createdAt: timestampToIso(data.createdAt),
  };
}

function toReportAdminDetails(
  id: string,
  data: Partial<ReportAdminDetails> & { assignedAt?: Timestamp; updatedAt?: Timestamp },
): ReportAdminDetails {
  return {
    id,
    assignedAt: timestampToIso(data.assignedAt),
    assignedDepartment: data.assignedDepartment,
    assignedLguId: data.assignedLguId,
    assignedStaff: data.assignedStaff,
    duplicateOfReportId: data.duplicateOfReportId,
    moderationReason: data.moderationReason,
    responseNote: data.responseNote,
    reviewFlag: data.reviewFlag ?? "active",
    slaDueAt: data.slaDueAt,
    updatedAt: timestampToIso(data.updatedAt),
    updatedBy: data.updatedBy,
  };
}

function toLguAccount(id: string, data: Partial<LguAccount>): LguAccount {
  return {
    id,
    adminEmail: data.adminEmail ?? "",
    area: data.area ?? "",
    createdAt: timestampToIso(data.createdAt),
    name: data.name ?? "Unnamed LGU",
    plan: data.plan ?? "free-pilot",
    status: data.status ?? "pilot",
    updatedAt: timestampToIso(data.updatedAt),
  };
}

function toAuditLog(id: string, data: Partial<Omit<AuditLog, "createdAt">> & { createdAt?: string | Timestamp }): AuditLog {
  return {
    id,
    action: data.action ?? "system.event",
    actorId: data.actorId ?? "",
    createdAt: timestampToIso(data.createdAt),
    summary: data.summary ?? "Admin activity recorded.",
    targetId: data.targetId ?? "",
    targetType: data.targetType ?? "system",
  };
}

export function listenToAdminUsers(
  onUsers: (users: AdminUserProfile[]) => void,
  onError: (message: string) => void,
) {
  return onSnapshot(
    query(collection(db, "users"), limit(250)),
    (snapshot) => {
      onUsers(snapshot.docs.map((userDoc) => toAdminUserProfile(userDoc.id, userDoc.data() as AdminUserProfile)));
    },
    (error) => onError(error.message),
  );
}

export function listenToLgus(
  onLgus: (lgus: LguAccount[]) => void,
  onError: (message: string) => void,
) {
  return onSnapshot(
    query(collection(db, "lgus"), limit(100)),
    (snapshot) => {
      onLgus(snapshot.docs.map((lguDoc) => toLguAccount(lguDoc.id, lguDoc.data() as LguAccount)));
    },
    (error) => onError(error.message),
  );
}

export function listenToAuditLogs(
  onLogs: (logs: AuditLog[]) => void,
  onError: (message: string) => void,
) {
  return onSnapshot(
    query(collection(db, "auditLogs"), limit(100)),
    (snapshot) => {
      const logs = snapshot.docs
        .map((logDoc) => toAuditLog(logDoc.id, logDoc.data() as AuditLog))
        .sort((first, second) => new Date(second.createdAt ?? 0).getTime() - new Date(first.createdAt ?? 0).getTime());
      onLogs(logs);
    },
    (error) => onError(error.message),
  );
}

export function listenToAdminConfirmations(
  onConfirmations: (confirmations: AdminConfirmation[]) => void,
  onError: (message: string) => void,
) {
  return onSnapshot(
    query(collection(db, "upvotes"), limit(500)),
    (snapshot) => {
      onConfirmations(
        snapshot.docs
          .map((confirmationDoc) =>
            toAdminConfirmation(confirmationDoc.id, confirmationDoc.data() as Partial<AdminConfirmation> & { createdAt?: Timestamp }),
          )
          .filter((confirmation): confirmation is AdminConfirmation => confirmation !== null),
      );
    },
    (error) => onError(error.message),
  );
}

export function listenToReportAdminDetails(
  onDetails: (details: ReportAdminDetails[]) => void,
  onError: (message: string) => void,
) {
  return onSnapshot(
    query(collection(db, "reportAdmin"), limit(500)),
    (snapshot) => {
      onDetails(
        snapshot.docs.map((detailsDoc) =>
          toReportAdminDetails(
            detailsDoc.id,
            detailsDoc.data() as Partial<ReportAdminDetails> & { assignedAt?: Timestamp; updatedAt?: Timestamp },
          ),
        ),
      );
    },
    (error) => onError(error.message),
  );
}

export function listenToStatusLogs(
  onLogs: (logs: AuditLog[]) => void,
  onError: (message: string) => void,
) {
  return onSnapshot(
    query(collection(db, "statusLogs"), limit(100)),
    (snapshot) => {
      const logs = snapshot.docs
        .map((logDoc) => {
          const data = logDoc.data() as {
            createdAt?: Timestamp;
            note?: string;
            reportId?: string;
            status?: string;
            updatedBy?: string;
          };

          return toAuditLog(logDoc.id, {
            action: "report.status",
            actorId: data.updatedBy ?? "",
            createdAt: data.createdAt,
            summary: data.note ?? `Report status changed to ${data.status ?? "updated"}.`,
            targetId: data.reportId ?? "",
            targetType: "report",
          });
        })
        .sort((first, second) => new Date(second.createdAt ?? 0).getTime() - new Date(first.createdAt ?? 0).getTime());
      onLogs(logs);
    },
    (error) => onError(error.message),
  );
}

export function listenToSystemSettings(
  onSettings: (settings: SystemSettings) => void,
  onError: (message: string) => void,
) {
  return listenToAdminSetting("system", defaultSystemSettings, onSettings, onError);
}

export function listenToWorkflowSettings(
  onSettings: (settings: WorkflowSettings) => void,
  onError: (message: string) => void,
) {
  return listenToAdminSetting("workflow", defaultWorkflowSettings, onSettings, onError);
}

function listenToAdminSetting<T extends object>(
  settingId: string,
  fallback: T,
  onSettings: (settings: T) => void,
  onError: (message: string) => void,
) {
  return onSnapshot(
    doc(db, "adminSettings", settingId),
    (snapshot) => {
      onSettings(snapshot.exists() ? ({ ...fallback, ...snapshot.data() } as T) : fallback);
    },
    (error) => onError(error.message),
  );
}

export async function updateUserAdminFields(
  uid: string,
  fields: {
    assignedArea?: string;
    assignedDepartment?: string;
    disableReason?: string;
    disabled?: boolean;
    role?: UserRole;
  },
) {
  const actorId = requireActorId();
  const batch = writeBatch(db);

  batch.update(doc(db, "users", uid), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(collection(db, "auditLogs")), {
    action: getUserAuditAction(fields),
    actorId,
    targetType: "user",
    targetId: uid,
    summary: getUserAuditSummary(fields),
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

function getUserAuditAction(fields: Parameters<typeof updateUserAdminFields>[1]) {
  if (fields.role) {
    return "user.roleChanged";
  }

  if (fields.disabled === true) {
    return "user.disabled";
  }

  if (fields.disabled === false) {
    return "user.reactivated";
  }

  return "user.updated";
}

function getUserAuditSummary(fields: Parameters<typeof updateUserAdminFields>[1]) {
  if (fields.role) {
    return `User role changed to ${fields.role}.`;
  }

  if (fields.disabled === true) {
    return fields.disableReason
      ? `User account disabled. Reason: ${fields.disableReason}`
      : "User account disabled.";
  }

  if (fields.disabled === false) {
    return "User account reactivated.";
  }

  if (fields.assignedArea || fields.assignedDepartment) {
    return "User assignment was updated.";
  }

  return "User account profile was updated.";
}

export async function saveLguAccount(draft: LguAccountDraft, lguId?: string) {
  const actorId = requireActorId();
  const lguRef = lguId ? doc(db, "lgus", lguId) : doc(collection(db, "lgus"));
  const snapshot = await getDoc(lguRef);
  const payload = {
    adminEmail: draft.adminEmail.trim(),
    area: draft.area.trim(),
    name: draft.name.trim(),
    plan: draft.plan,
    status: draft.status,
    updatedAt: serverTimestamp(),
  };
  const batch = writeBatch(db);

  batch.set(
    lguRef,
    snapshot.exists()
      ? payload
      : {
          ...payload,
          createdAt: serverTimestamp(),
        },
    { merge: true },
  );
  batch.set(doc(collection(db, "auditLogs")), {
    action: getLguAuditAction(snapshot.exists(), snapshot.data() as Partial<LguAccount> | undefined, draft),
    actorId,
    targetType: "lgu",
    targetId: lguRef.id,
    summary: getLguAuditSummary(snapshot.exists(), snapshot.data() as Partial<LguAccount> | undefined, draft),
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

function getLguAuditAction(exists: boolean, current: Partial<LguAccount> | undefined, draft: LguAccountDraft) {
  if (!exists) {
    return "lgu.created";
  }

  if (current?.plan && current.plan !== draft.plan) {
    return "lgu.planUpdated";
  }

  return "lgu.updated";
}

function getLguAuditSummary(exists: boolean, current: Partial<LguAccount> | undefined, draft: LguAccountDraft) {
  if (!exists) {
    return `${draft.name.trim()} LGU account created.`;
  }

  if (current?.plan && current.plan !== draft.plan) {
    return `${draft.name.trim()} plan changed from ${current.plan} to ${draft.plan}.`;
  }

  return `${draft.name.trim()} LGU account updated.`;
}

export async function saveSystemSettings(settings: SystemSettings) {
  await saveAdminSettings("system", settings, "System settings were updated.");
}

export async function saveWorkflowSettings(settings: WorkflowSettings) {
  await saveAdminSettings("workflow", settings, "Workflow settings were updated.");
}

async function saveAdminSettings(settingId: string, settings: object, summary: string) {
  const actorId = requireActorId();
  const batch = writeBatch(db);

  batch.set(
    doc(db, "adminSettings", settingId),
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  batch.set(doc(collection(db, "auditLogs")), {
    action: "settings.updated",
    actorId,
    targetType: "settings",
    targetId: settingId,
    summary,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function seedDefaultAdminSettings() {
  await Promise.all([
    setDoc(doc(db, "adminSettings", "system"), defaultSystemSettings, { merge: true }),
    setDoc(doc(db, "adminSettings", "workflow"), defaultWorkflowSettings, { merge: true }),
  ]);
}
