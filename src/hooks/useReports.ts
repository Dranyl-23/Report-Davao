import { useEffect, useMemo, useState } from "react";
import { sampleReports } from "../data/sampleReports";
import { listenToConfirmations, listenToReports, type ReportConfirmation } from "../lib/reports";
import type { CivicReport } from "../types/report";

const firestoreLoadTimeoutMs = 7000;

function friendlyFirestoreError(message: string) {
  if (message.includes("Database") && message.includes("not found")) {
    return "Live report data is not available yet. Please try again after setup is completed.";
  }

  if (message.includes("offline") || message.includes("unavailable")) {
    return "Live report data is unreachable right now. Check your connection and refresh.";
  }

  if (message.includes("permission-denied")) {
    return "You do not have permission to access this report data right now.";
  }

  return message;
}

export function useReports(userId?: string) {
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [confirmations, setConfirmations] = useState<ReportConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let receivedFirstResponse = false;
    const timeoutId = window.setTimeout(() => {
      if (!receivedFirstResponse) {
        setError("Live report data is taking too long to load. Showing demo reports for now.");
        setLoading(false);
      }
    }, firestoreLoadTimeoutMs);

    const unsubscribeReports = listenToReports(
      (nextReports) => {
        receivedFirstResponse = true;
        window.clearTimeout(timeoutId);
        setReports(nextReports);
        setError("");
        setLoading(false);
      },
      (message) => {
        receivedFirstResponse = true;
        window.clearTimeout(timeoutId);
        setError(friendlyFirestoreError(message));
        setLoading(false);
      },
    );

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribeReports();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setConfirmations([]);
      return;
    }

    const unsubscribeConfirmations = listenToConfirmations(
      userId,
      (nextConfirmations) => {
        setConfirmations(nextConfirmations);
      },
      (message) => {
        setError(friendlyFirestoreError(message));
      },
    );

    return () => {
      unsubscribeConfirmations();
    };
  }, [userId]);

  const confirmedReportIds = useMemo(() => {
    if (!userId) {
      return new Set<string>();
    }

    return new Set(
      confirmations
        .filter((confirmation) => confirmation.userId === userId)
        .map((confirmation) => confirmation.reportId),
    );
  }, [confirmations, userId]);

  const displayReports = useMemo(
    () => (!loading && reports.length === 0 ? sampleReports : reports),
    [reports, loading],
  );

  return {
    reports,
    displayReports,
    confirmedReportIds,
    loading,
    error,
    usingSampleData: !loading && reports.length === 0,
  };
}
