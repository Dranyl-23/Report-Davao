import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RequireAuth } from "./components/RequireAuth";
import { AdminPage } from "./pages/AdminPage";
import { AuthPage } from "./pages/AuthPage";
import { ForLGUsPage } from "./pages/ForLGUsPage";
import { MyReportsPage } from "./pages/MyReportsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReportDetailPage } from "./pages/ReportDetailPage";
import { ReportsPage } from "./pages/ReportsPage";
import { StatsPage } from "./pages/StatsPage";
import { SubmitReportPage } from "./pages/SubmitReportPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<ReportsPage />} />
        <Route path="auth" element={<AuthPage />} />
        <Route
          path="submit"
          element={
            <RequireAuth>
              <SubmitReportPage />
            </RequireAuth>
          }
        />
        <Route
          path="my-reports"
          element={
            <RequireAuth>
              <MyReportsPage />
            </RequireAuth>
          }
        />
        <Route
          path="profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route path="reports/:reportId" element={<ReportDetailPage />} />
        <Route path="for-lgus" element={<ForLGUsPage />} />
        <Route
          path="admin"
          element={
            <RequireAuth adminOnly>
              <AdminPage />
            </RequireAuth>
          }
        />
        <Route path="stats" element={<StatsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
