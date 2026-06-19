import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

interface RequireAuthProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export function RequireAuth({ adminOnly = false, children }: RequireAuthProps) {
  const location = useLocation();
  const { isSuperAdmin, profile, profileError, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="rounded-lg border border-civic-line bg-white p-6 text-sm font-semibold text-slate-600">
        Checking session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (profile?.disabled) {
    return (
      <div className="rounded-lg border border-civic-line bg-white p-6">
        <h2 className="text-lg font-bold text-civic-ink">Account restricted</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your account is currently restricted. Please contact the Report Davao administrator.
        </p>
      </div>
    );
  }

  if (adminOnly && !isSuperAdmin) {
    return (
      <div className="rounded-lg border border-civic-line bg-white p-6">
        <h2 className="text-lg font-bold text-civic-ink">Super admin access required</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This hidden console is reserved for the system owner account.
        </p>
        {profileError ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            {profileError}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {profileError ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          {profileError}
        </p>
      ) : null}
      {children}
    </>
  );
}
