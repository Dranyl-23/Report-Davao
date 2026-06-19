import { useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  LogIn,
  LogOut,
  LucideIcon,
  MapPinned,
  Menu,
  PlusCircle,
  ShieldCheck,
  UserCircle,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import logoUrl from "../assets/images/RD_logo.png";
import { useAuth } from "../lib/auth";

const navItems = [
  { to: "/", label: "Reports", icon: MapPinned, end: true },
  { to: "/submit", label: "Submit", icon: PlusCircle },
  { to: "/stats", label: "Stats", icon: BarChart3 },
];

const navBaseClass =
  "inline-flex h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-civic-green focus:ring-offset-2";
const mobileNavBaseClass =
  "flex h-11 w-full items-center justify-start gap-2 rounded-lg px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-civic-green focus:ring-offset-2";

const navInactiveClass = "bg-civic-field text-slate-700 hover:bg-white hover:text-civic-ink";
const navActiveClass = "bg-civic-ink text-white";
const installPromptDismissedKey = "report-davao-install-prompt-dismissed";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

function isRunningAsInstalledApp() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

interface NavigationLinkProps {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}

function NavigationLink({ to, label, icon: Icon, end = false, mobile = false, onNavigate }: NavigationLinkProps) {
  const baseClass = mobile ? mobileNavBaseClass : navBaseClass;

  return (
    <NavLink
      end={end}
      to={to}
      onClick={onNavigate}
      className={({ isActive }) => `${baseClass} ${isActive ? navActiveClass : navInactiveClass}`}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    if (isRunningAsInstalledApp()) {
      return;
    }

    let timeoutId: number | undefined;

    const handleBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;

      installEvent.preventDefault();
      setDeferredPrompt(installEvent);

      if (window.sessionStorage.getItem(installPromptDismissedKey) === "true") {
        return;
      }

      timeoutId = window.setTimeout(() => {
        setShowInstallPrompt(true);
      }, 900);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
      window.sessionStorage.setItem(installPromptDismissedKey, "true");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  function handleInstallLater() {
    window.sessionStorage.setItem(installPromptDismissedKey, "true");
    setShowInstallPrompt(false);
  }

  const visibleNavItems = user
    ? [
        ...navItems,
        { to: "/my-reports", label: "My Reports", icon: ClipboardList },
        { to: "/profile", label: "Profile", icon: UserCircle },
      ]
    : navItems;
  const isAdminRoute = location.pathname.startsWith("/admin");

  function handleLogout() {
    setMobileMenuOpen(false);
    setLogoutError("");
    setLogoutModalOpen(true);
  }

  async function confirmLogout() {
    setLogoutLoading(true);
    setLogoutError("");

    try {
      await logout();
      setLogoutModalOpen(false);
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Logout failed. Please try again.");
    } finally {
      setLogoutLoading(false);
    }
  }

  function closeLogoutModal() {
    if (logoutLoading) {
      return;
    }

    setLogoutModalOpen(false);
    setLogoutError("");
  }

  useEffect(() => {
    if (!logoutModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeLogoutModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [logoutLoading, logoutModalOpen]);

  return (
    <div className="min-h-screen bg-[#eef2ef]">
      <header className="sticky top-0 z-[900] border-b border-civic-line bg-white shadow-sm">
        {isAdminRoute ? (
          <div className="mx-auto flex max-w-[96rem] flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-civic-line">
                <img src={logoUrl} alt="Report Davao" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold uppercase tracking-wide text-civic-green">Hidden System Owner Console</p>
                <h1 className="truncate text-lg font-bold text-civic-ink">Report Davao Super Admin</h1>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-civic-green ring-1 ring-emerald-100">
                <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>Super admin only</span>
              </div>
              {user ? (
                <p className="break-all rounded-lg bg-civic-field px-3 py-2 text-sm font-semibold text-slate-600">
                  {user.email ?? user.displayName}
                </p>
              ) : null}
              {user ? (
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-civic-line bg-civic-field px-4 text-sm font-bold text-civic-ink transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-civic-green focus:ring-offset-2"
                  onClick={handleLogout}
                  type="button"
                >
                  <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>Logout</span>
                </button>
              ) : (
                <NavigationLink to="/auth" label="Login" icon={LogIn} />
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-civic-line">
                  <img src={logoUrl} alt="Report Davao" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-bold text-civic-ink">Report Davao</h1>
                  <p className="truncate text-sm text-slate-600">Civic issue reporting platform</p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-civic-line bg-civic-field text-civic-ink transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-civic-green focus:ring-offset-2 xl:hidden"
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
              >
                {mobileMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
              </button>
            </div>
            <div className="hidden min-w-0 flex-col gap-2 xl:flex xl:items-end">
              <div className="flex max-w-full items-center gap-3 pb-1">
                <nav className="flex shrink-0 gap-2" aria-label="Primary navigation">
                  {visibleNavItems.map((item) => (
                    <NavigationLink key={item.to} {...item} />
                  ))}
                </nav>
                <div className="h-8 w-px shrink-0 bg-civic-line" aria-hidden="true" />
                {user ? (
                  <button className={`${navBaseClass} ${navInactiveClass}`} onClick={handleLogout} type="button">
                    <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>Logout</span>
                  </button>
                ) : (
                  <NavigationLink to="/auth" label="Login" icon={LogIn} />
                )}
              </div>
              {user ? <p className="text-xs font-semibold text-slate-500">{user.email ?? user.displayName}</p> : null}
            </div>
            {mobileMenuOpen ? (
              <div className="rounded-lg border border-civic-line bg-white p-2 shadow-sm xl:hidden">
                <nav className="grid gap-2" aria-label="Mobile navigation">
                  {visibleNavItems.map((item) => (
                    <NavigationLink
                      key={item.to}
                      {...item}
                      mobile
                      onNavigate={() => setMobileMenuOpen(false)}
                    />
                  ))}
                </nav>
                <div className="my-2 h-px bg-civic-line" aria-hidden="true" />
                {user ? (
                  <button className={`${mobileNavBaseClass} ${navInactiveClass}`} onClick={handleLogout} type="button">
                  <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>Logout</span>
                  </button>
                ) : (
                  <NavigationLink to="/auth" label="Login" icon={LogIn} mobile onNavigate={() => setMobileMenuOpen(false)} />
                )}
                {user ? (
                  <p className="mt-2 break-all rounded-lg bg-civic-field px-3 py-2 text-xs font-semibold text-slate-500">
                    {user.email ?? user.displayName}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </header>
      <main className={`mx-auto px-4 py-5 sm:px-6 lg:px-8 ${isAdminRoute ? "max-w-[96rem]" : "max-w-7xl"}`}>
        <Outlet />
      </main>
      {showInstallPrompt && !isAdminRoute ? (
        <div className="fixed inset-x-0 bottom-0 z-[950] px-4 pb-4 sm:bottom-6 sm:px-6" role="presentation">
          <section
            aria-labelledby="install-dialog-title"
            aria-modal="false"
            className="mx-auto flex max-w-md flex-col gap-4 rounded-lg border border-civic-line bg-white p-4 shadow-xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-civic-green">
                  <MapPinned className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="install-dialog-title" className="text-base font-bold text-civic-ink">
                    Install Report Davao
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Add this app to your home screen for faster reporting and easier access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-civic-field hover:text-civic-ink focus:outline-none focus:ring-2 focus:ring-civic-green"
                onClick={handleInstallLater}
                aria-label="Dismiss install prompt"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-civic-green px-4 text-sm font-bold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-civic-green focus:ring-offset-2"
                onClick={handleInstallClick}
              >
                Install app
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-civic-line bg-civic-field px-4 text-sm font-bold text-civic-ink hover:bg-white focus:outline-none focus:ring-2 focus:ring-civic-green focus:ring-offset-2"
                onClick={handleInstallLater}
              >
                Maybe later
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {logoutModalOpen ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 px-4"
          role="presentation"
          onMouseDown={closeLogoutModal}
        >
          <section
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            className="w-full max-w-md rounded-lg border border-civic-line bg-white p-5 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-civic-red">
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="logout-dialog-title" className="text-lg font-bold text-civic-ink">
                    Confirm logout
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Are you sure you want to sign out of Report Davao?
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-civic-field hover:text-civic-ink focus:outline-none focus:ring-2 focus:ring-civic-green"
                onClick={closeLogoutModal}
                disabled={logoutLoading}
                aria-label="Close logout confirmation"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {logoutError ? (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-civic-red">
                {logoutError}
              </p>
            ) : null}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-civic-line bg-civic-field px-4 text-sm font-bold text-civic-ink hover:bg-white disabled:opacity-60"
                onClick={closeLogoutModal}
                disabled={logoutLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-civic-red px-4 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={confirmLogout}
                disabled={logoutLoading}
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                {logoutLoading ? "Logging out..." : "Logout"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
