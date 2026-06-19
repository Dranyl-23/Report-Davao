import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
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

interface ReportsContextValue {
  reports: CivicReport[];
  displayReports: CivicReport[];
  loading: boolean;
  error: string;
  usingSampleData: boolean;
}

const ReportsContext = createContext<ReportsContextValue | undefined>(undefined);

interface ReportsProviderProps {
  children: ReactNode;
}

export function ReportsProvider({ children }: ReportsProviderProps) {
  const [reports, setReports] = useState<CivicReport[]>([]);
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

  const displayReports = useMemo(
    () => (!loading && reports.length === 0 ? sampleReports : reports),
    [reports, loading],
  );

  const value = useMemo(
    () => ({
      reports,
      displayReports,
      loading,
      error,
      usingSampleData: !loading && reports.length === 0,
    }),
    [reports, displayReports, loading, error],
  );

  return React.createElement(ReportsContext.Provider, { value }, children);
}

export function useReports(userId?: string) {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error("useReports must be used within a ReportsProvider");
  }

  const { reports, displayReports, loading, error, usingSampleData } = context;
  const [confirmations, setConfirmations] = useState<ReportConfirmation[]>([]);
  const [confirmationsError, setConfirmationsError] = useState("");

  useEffect(() => {
    if (!userId) {
      setConfirmations([]);
      return;
    }

    const unsubscribeConfirmations = listenToConfirmations(
      userId,
      (nextConfirmations) => {
        setConfirmations(nextConfirmations);
        setConfirmationsError("");
      },
      (message) => {
        setConfirmationsError(friendlyFirestoreError(message));
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

  return {
    reports,
    displayReports,
    confirmedReportIds,
    loading,
    error: error || confirmationsError,
    usingSampleData,
  };
}

