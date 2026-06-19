import {
  BarChart3,
  Building2,
  CheckCircle2,
  FileText,
  GraduationCap,
  Handshake,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

const lguPlans = [
  {
    name: "Barangay Basic",
    price: "PHP 500 / month",
    fit: "For barangays starting a digital complaint desk.",
    features: ["Admin report list", "Status management", "Citizen confirmations", "Basic report history"],
  },
  {
    name: "Municipality Pro",
    price: "PHP 3,000-5,000 / month",
    fit: "For municipal offices managing reports across multiple areas.",
    features: ["Everything in Basic", "Analytics panel", "CSV export", "Priority support"],
    highlighted: true,
  },
  {
    name: "City Premium",
    price: "PHP 10,000-15,000 / month",
    fit: "For city-level operations with department coordination.",
    features: ["Everything in Pro", "Multi-department routing", "Monthly insights", "Dedicated account manager"],
  },
  {
    name: "White-Label Setup",
    price: "PHP 20,000 setup + PHP 8,000 / month",
    fit: "For LGUs that need custom branding and a dedicated public portal.",
    features: ["Custom LGU branding", "Own domain support", "Full configuration", "Staff handover session"],
  },
];

const incomeStreams = [
  {
    title: "Citizen reporting stays free",
    detail: "Residents can submit, confirm, and track civic reports without a subscription barrier.",
    icon: Users,
  },
  {
    title: "LGU SaaS is the core revenue",
    detail: "Barangays, municipalities, and cities pay for dashboards, workflow tools, analytics, and exports.",
    icon: Building2,
  },
  {
    title: "PDF evidence exports",
    detail: "Citizens can later pay per timestamped, GPS-tagged report document for hearings, claims, or records.",
    icon: FileText,
  },
  {
    title: "Onboarding and training",
    detail: "New LGU partners can pay one-time setup and staff training fees during rollout.",
    icon: GraduationCap,
  },
];

const rolloutSteps = [
  "Run a free pilot with selected barangays or student-covered areas.",
  "Collect enough verified reports to prove usage and response value.",
  "Offer paid LGU dashboards, exports, training, and white-label setup.",
  "Add sponsorships and anonymized data insights only after report volume is meaningful.",
];

export function ForLGUsPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-civic-line bg-white p-5">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-civic-green">
              <Building2 size={24} aria-hidden="true" />
            </div>
            <p className="mt-5 text-sm font-bold uppercase tracking-wide text-civic-green">For LGUs</p>
            <h2 className="mt-2 text-2xl font-bold text-civic-ink sm:text-3xl">
              Turn citizen reports into a trackable response system.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Report Davao keeps public reporting free for citizens while giving LGUs paid tools for triage,
              status updates, analytics, and documented issue response.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-civic-green px-4 text-sm font-bold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-civic-green focus:ring-offset-2"
              >
                View public reports
              </Link>
              <Link
                to="/submit"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-civic-line bg-civic-field px-4 text-sm font-bold text-civic-ink hover:bg-white focus:outline-none focus:ring-2 focus:ring-civic-green focus:ring-offset-2"
              >
                Try report submission
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-lg border border-civic-line bg-civic-field p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Primary customer</p>
              <p className="mt-2 text-xl font-bold text-civic-ink">LGUs and barangays</p>
            </div>
            <div className="rounded-lg border border-civic-line bg-civic-field p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Citizen access</p>
              <p className="mt-2 text-xl font-bold text-civic-green">Free</p>
            </div>
            <div className="rounded-lg border border-civic-line bg-civic-field p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Year 2 projection</p>
              <p className="mt-2 text-xl font-bold text-civic-ink">PHP 1.29M+</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {incomeStreams.map((stream) => {
          const Icon = stream.icon;

          return (
            <div key={stream.title} className="rounded-lg border border-civic-line bg-white p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-civic-green">
                <Icon size={20} aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-bold text-civic-ink">{stream.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{stream.detail}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-lg border border-civic-line bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-civic-ink">LGU Subscription Plans</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pricing is structured so small barangays can start low while larger LGUs pay for coordination and analytics.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-civic-green">
            <ShieldCheck size={18} aria-hidden="true" />
            Free pilot first
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-4">
          {lguPlans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-lg border p-4 ${
                plan.highlighted ? "border-civic-green bg-emerald-50/50" : "border-civic-line bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-civic-ink">{plan.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{plan.fit}</p>
                </div>
                {plan.highlighted ? (
                  <span className="rounded-full bg-civic-green px-2 py-1 text-xs font-bold text-white">Best fit</span>
                ) : null}
              </div>
              <p className="mt-4 text-xl font-bold text-civic-green">{plan.price}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm leading-6 text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-civic-green" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-civic-line bg-white p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-civic-blue">
            <BarChart3 size={22} aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-civic-ink">Income Path</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The MVP should prove usage first. Paid features can be introduced after LGUs see clear report volume,
            location patterns, and citizen participation.
          </p>
        </div>

        <div className="rounded-lg border border-civic-line bg-white p-5">
          <h2 className="text-xl font-bold text-civic-ink">Rollout Plan</h2>
          <div className="mt-4 space-y-3">
            {rolloutSteps.map((step, index) => (
              <div key={step} className="grid grid-cols-[auto_1fr] gap-3 rounded-lg bg-civic-field p-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold text-civic-green ring-1 ring-civic-line">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-civic-line bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-civic-field px-3 py-2 text-sm font-bold text-civic-ink">
              <Handshake size={18} aria-hidden="true" />
              Pitch defense
            </div>
            <h2 className="mt-4 text-xl font-bold text-civic-ink">Why this can earn without charging every citizen</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              The public side creates adoption and verified civic data. The paid LGU side converts that activity into
              operational value through dashboards, exports, training, and future analytics.
            </p>
          </div>
          <Link
            to="/stats"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-civic-line bg-civic-field px-4 text-sm font-bold text-civic-ink hover:bg-white focus:outline-none focus:ring-2 focus:ring-civic-green focus:ring-offset-2"
          >
            View stats
          </Link>
        </div>
      </section>
    </div>
  );
}
