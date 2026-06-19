import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/auth";
import { isCitizenProfileComplete } from "../lib/profile";

function friendlyAuthError(message: string) {
  if (message.includes("auth/api-key-not-valid")) {
    return "Firebase API key is invalid. Replace VITE_FIREBASE_API_KEY in .env with the exact API key copied from Firebase Project settings.";
  }

  if (message.includes("auth/invalid-credential")) {
    return "Invalid email or password.";
  }

  if (message.includes("auth/email-already-in-use")) {
    return "Email is already registered.";
  }

  if (message.includes("auth/weak-password")) {
    return "Password should be at least 6 characters.";
  }

  if (message.includes("auth/popup-closed-by-user")) {
    return "Google sign-in was closed before finishing.";
  }

  return message;
}

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user, loading, login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const locationState = location.state as
    | { from?: { pathname?: string; search?: string; hash?: string } }
    | null;
  const from = locationState?.from;
  const redirectTo =
    from?.pathname && from.pathname !== "/auth"
      ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`
      : "/";

  if (!loading && user) {
    return (
      <Navigate
        to={isCitizenProfileComplete(profile) ? redirectTo : "/profile"}
        state={!isCitizenProfileComplete(profile) ? { setupProfile: true, from: redirectTo } : undefined}
        replace
      />
    );
  }

  function navigateAfterAuth(nextProfile: Awaited<ReturnType<typeof login>>) {
    if (isCitizenProfileComplete(nextProfile)) {
      navigate(redirectTo, { replace: true });
      return;
    }

    navigate("/profile", {
      replace: true,
      state: { setupProfile: true, from: redirectTo },
    });
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const nextProfile =
        mode === "login"
          ? await login(email, password)
          : await register(email, password);
      navigateAfterAuth(nextProfile);
    } catch (authError) {
      setError(friendlyAuthError(authError instanceof Error ? authError.message : "Authentication failed."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setSubmitting(true);

    try {
      const nextProfile = await loginWithGoogle();
      navigateAfterAuth(nextProfile);
    } catch (authError) {
      setError(friendlyAuthError(authError instanceof Error ? authError.message : "Google sign-in failed."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-xl items-center justify-center">
      <section className="rounded-lg border border-civic-line bg-white p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-civic-green">
          <ShieldCheck size={24} aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-civic-ink">
          {mode === "login" ? "Sign in to Report Davao" : "Create your account"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Submit civic reports, track updates, and help your pilot area build a transparent issue response record.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleEmailSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Email</span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-civic-line bg-white px-3 text-sm outline-none focus:border-civic-green focus:ring-2 focus:ring-emerald-100"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Password</span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-civic-line bg-white px-3 text-sm outline-none focus:border-civic-green focus:ring-2 focus:ring-emerald-100"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-civic-red">{error}</p> : null}

          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-civic-green px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
          >
            <Mail size={18} aria-hidden="true" />
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <button
          className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-civic-line bg-civic-field px-4 text-sm font-bold text-civic-ink disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting}
          onClick={handleGoogleLogin}
          type="button"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
            />
          </svg>
          Continue with Google
        </button>

        <button
          className="mt-4 text-sm font-bold text-civic-blue"
          onClick={() => {
            setError("");
            setMode(mode === "login" ? "register" : "login");
          }}
          type="button"
        >
          {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
        </button>
      </section>
    </div>
  );
}
