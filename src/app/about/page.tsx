import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import Link from "next/link";

const team = [
  { name: "Platform Engineering", desc: "Designed and built to handle high-concurrency academic bidding with transactional integrity." },
  { name: "Domain Design", desc: "Business rules derived from real B-school allocation workflows: MRB computation, tie-break governance, credit constraints." },
  { name: "Academic Operations", desc: "Built with academic administrators, not just developers — every feature reflects real operational need." },
];

const values = [
  { title: "Fairness by design", body: "Every allocation decision is rule-based and auditable. No black boxes, no admin overrides without a trail." },
  { title: "Transparency for students", body: "Students see live MRB, demand ratios, seat counts, and tie-break policies before they place a single point." },
  { title: "Configurability first", body: "B-schools differ. Carry-forward rules, cross-programme eligibility, confirmation rounds — all configurable per cycle." },
  { title: "Trust through audit", body: "Every state change — bid, withdrawal, allocation, override — is stored with actor, timestamp, before/after JSON." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main>
        {/* Hero */}
        <section className="bg-slate-900 text-white py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-indigo-400 font-medium text-sm uppercase tracking-widest mb-4">About BidScholar</p>
            <h1 className="text-4xl font-bold leading-tight mb-6">
              Built for the complexity of graduate management education
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">
              BidScholar is a dedicated elective course bidding platform for B-schools and postgraduate management programmes.
              We replace spreadsheets, email chains, and first-come-first-served chaos with a structured,
              transparent, and auditable allocation system.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 px-6 border-b border-slate-100">
          <div className="max-w-4xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Why we built this</h2>
                <div className="space-y-4 text-slate-600 leading-relaxed">
                  <p>
                    Elective course selection in management programmes is, at its core, an allocation problem under scarcity.
                    High-demand electives have more interested students than seats. Some students have stronger preferences.
                    Some courses are restricted by programme. Some require prerequisites.
                  </p>
                  <p>
                    Most institutions handle this with spreadsheets and manual processes. The result: opaque decisions,
                    administrative burden, student frustration, and no reliable audit trail for grievances.
                  </p>
                  <p>
                    BidScholar solves this by implementing a structured, points-based bidding auction with configurable
                    tie-break rules, real-time MRB computation, and a complete audit log for every decision.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Allocation time", from: "2–3 weeks", to: "< 2 hours" },
                  { label: "Manual overrides", from: "Common", to: "Audited only" },
                  { label: "Student transparency", from: "None", to: "Full" },
                  { label: "Grievance risk", from: "High", to: "Minimal" },
                ].map(item => (
                  <div key={item.label} className="p-5 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">{item.label}</p>
                    <p className="text-sm text-slate-400 line-through">{item.from}</p>
                    <p className="text-base font-bold text-indigo-700">{item.to}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 px-6 border-b border-slate-100">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-10">Platform principles</h2>
            <div className="grid lg:grid-cols-2 gap-6">
              {values.map(v => (
                <div key={v.title} className="p-6 border border-slate-200 rounded-xl">
                  <h3 className="font-semibold text-slate-900 mb-2">{v.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Build approach */}
        <section className="py-16 px-6 border-b border-slate-100 bg-slate-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">How it was designed</h2>
            <div className="grid lg:grid-cols-3 gap-6">
              {team.map(t => (
                <div key={t.name} className="p-5 bg-white border border-slate-200 rounded-xl">
                  <h3 className="font-semibold text-slate-900 mb-2">{t.name}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tech */}
        <section className="py-16 px-6 border-b border-slate-100">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Technical foundation</h2>
            <p className="text-slate-600 mb-8 max-w-2xl">
              Built on modern, battle-tested infrastructure designed for reliability under the concurrent load
              of hundreds of students accessing the system simultaneously during bidding windows.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Next.js 16", cat: "Frontend / SSR" },
                { label: "Prisma ORM", cat: "Data layer" },
                { label: "PostgreSQL", cat: "Production DB" },
                { label: "NextAuth.js", cat: "Authentication" },
                { label: "Zod", cat: "Schema validation" },
                { label: "TypeScript", cat: "Type safety" },
                { label: "Tailwind CSS", cat: "UI system" },
                { label: "SQLite (dev)", cat: "Local development" },
              ].map(t => (
                <div key={t.label} className="p-4 bg-slate-50 rounded-lg">
                  <p className="font-semibold text-slate-800 text-sm">{t.label}</p>
                  <p className="text-xs text-slate-400">{t.cat}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-6 bg-indigo-700 text-white text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Ready to modernise your elective allocation?</h2>
            <p className="text-indigo-200 mb-8">
              Request a demo or explore the platform with our pre-loaded seed data.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/request-demo"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors"
              >
                Request Demo
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center px-6 py-3 border border-indigo-400 text-white font-semibold rounded-xl hover:bg-indigo-600 transition-colors"
              >
                Try the Platform
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
