import { BarChart3, ClipboardList, LogIn, LogOut, LucideIcon, MapPinned, PlusCircle } from "lucide-react";
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

const navInactiveClass = "bg-civic-field text-slate-700 hover:bg-white hover:text-civic-ink";
const navActiveClass = "bg-civic-ink text-white";

interface NavigationLinkProps {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

function NavigationLink({ to, label, icon: Icon, end = false }: NavigationLinkProps) {
  return (
    <NavLink
      end={end}
      to={to}
      className={({ isActive }) => `${navBaseClass} ${isActive ? navActiveClass : navInactiveClass}`}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const visibleNavItems = user
    ? [...navItems, { to: "/my-reports", label: "My Reports", icon: ClipboardList }]
    : navItems;

  return (
    <div className="min-h-screen bg-[#eef2ef]">
      <header className="border-b border-civic-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-civic-line">
              <img src={logoUrl} alt="Report Davao" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-civic-ink">Report Davao</h1>
              <p className="text-sm text-slate-600">Civic issue reporting platform</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:items-end">
            <div className="flex max-w-full items-center gap-3 overflow-x-auto pb-1">
              <nav className="flex shrink-0 gap-2" aria-label="Primary navigation">
                {visibleNavItems.map((item) => (
                  <NavigationLink key={item.to} {...item} />
                ))}
              </nav>
              <div className="h-8 w-px shrink-0 bg-civic-line" aria-hidden="true" />
              {user ? (
                <button className={`${navBaseClass} ${navInactiveClass}`} onClick={logout} type="button">
                  <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>Logout</span>
                </button>
              ) : (
                <NavigationLink to="/auth" label="Login" icon={LogIn} />
              )}
            </div>
            {user ? <p className="text-xs font-semibold text-slate-500">{user.email ?? user.displayName}</p> : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
