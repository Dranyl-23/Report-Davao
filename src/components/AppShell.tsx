import { useState } from "react";
import { BarChart3, ClipboardList, LogIn, LogOut, LucideIcon, MapPinned, Menu, PlusCircle, X } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const visibleNavItems = user
    ? [...navItems, { to: "/my-reports", label: "My Reports", icon: ClipboardList }]
    : navItems;

  function handleLogout() {
    setMobileMenuOpen(false);
    void logout();
  }

  return (
    <div className="min-h-screen bg-[#eef2ef]">
      <header className="border-b border-civic-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
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
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-civic-line bg-civic-field text-civic-ink transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-civic-green focus:ring-offset-2 md:hidden"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
            >
              {mobileMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
          <div className="hidden min-w-0 flex-col gap-2 md:flex md:items-end">
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
            <div className="rounded-lg border border-civic-line bg-white p-2 shadow-sm md:hidden">
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
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
