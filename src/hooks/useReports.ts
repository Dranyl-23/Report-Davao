import { useEffect, useMemo, useState } from "react";
import { sampleReports } from "../data/sampleReports";
import { listenToConfirmations, listenToReports, type ReportConfirmation } from "../lib/reports";
import type { CivicReport } from "../types/report";

export function useReports(userId?: string) {
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [confirmations, setConfirmations] = useState<ReportConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribeReports = listenToReports(
      (nextReports) => {
        setReports(nextReports);
        setLoading(false);
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );

    const unsubscribeConfirmations = listenToConfirmations(
      (nextConfirmations) => {
        setConfirmations(nextConfirmations);
      },
      (message) => {
        setError(message);
      },
    );

    return () => {
      unsubscribeReports();
      unsubscribeConfirmations();
    };
  }, []);

  const confirmationCounts = useMemo(() => {
    return confirmations.reduce<Record<string, number>>((counts, confirmation) => {
      counts[confirmation.reportId] = (counts[confirmation.reportId] ?? 0) + 1;
      return counts;
    }, {});
  }, [confirmations]);

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

  const reportsWithConfirmationCounts = useMemo(
    () =>
      reports.map((report) => ({
        ...report,
        upvotes: confirmationCounts[report.id] ?? report.upvotes,
      })),
    [confirmationCounts, reports],
  );

  const displayReports = useMemo(
    () => (reportsWithConfirmationCounts.length > 0 ? reportsWithConfirmationCounts : sampleReports),
    [reportsWithConfirmationCounts],
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
