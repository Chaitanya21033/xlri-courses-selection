import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function SolutionsPage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />

      <section className="bg-slate-900 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-indigo-400 text-sm font-semibold uppercase tracking-wider mb-3">
            Platform Solutions
          </p>
          <h1 className="text-4xl font-bold text-white mb-4">
            A complete system for every stakeholder
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl">
            BidScholar is not a generic auction tool. It's purpose-built for
            the complexity of graduate management elective allocation — with
            built-in support for batch eligibility, tie-break auditability,
            and multi-round policy configuration.
          </p>
        </div>
      </section>

      {/* Solutions detail */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          {[
            {
              tag: "For Administrators",
              title: "Full operational control with complete transparency",
              description:
                "Set up and manage the entire bidding lifecycle from a single dashboard. Configure cycles, import cohorts, open and close rounds, run the allocation engine, and export results — all with every action logged.",
              bullets: [
                "Create academic terms and bidding cycles",
                "Configure per-cycle bid point budgets",
                "Set cross-programme eligibility and quota rules",
                "Open / close rounds with system-level gates",
                "Run allocation engine after round close",
                "Override allocations manually with audit trail",
                "Broadcast announcements to all students",
                "Export results for SIS import",
              ],
              reversed: false,
            },
            {
              tag: "For Faculty",
              title: "Define your course. Declare your rules. Stay informed.",
              description:
                "Professors have full control over course setup — and the responsibility to declare tie-break policies before bidding opens. Real-time demand visibility lets faculty plan their sessions before enrolment is finalised.",
              bullets: [
                "Create course offerings with full detail",
                "Define eligibility: BM, HRM, or both",
                "Set and modify seat capacity",
                "Declare tie-break policy (CQPI, grades, lottery…)",
                "Monitor live bidding demand for their courses",
                "View provisional and confirmed allocations",
              ],
              reversed: true,
            },
            {
              tag: "For Students",
              title: "Bid strategically with full information",
              description:
                "Students see a filtered catalog of eligible courses, live MRB data, demand indicators, and tie-break policies — everything they need to allocate bid points with confidence.",
              bullets: [
                "Browse only eligible courses (programme-filtered)",
                "See real-time MRB for each course",
                "Allocate, adjust, and withdraw bids",
                "Track winning/losing status per course",
                "Receive notifications for round open/close and results",
                "Download final allocation summary",
              ],
              reversed: false,
            },
          ].map((solution, i) => (
            <div
              key={i}
              className={`grid lg:grid-cols-2 gap-16 items-center ${
                solution.reversed ? "lg:grid-flow-col-dense" : ""
              }`}
            >
              <div className={solution.reversed ? "lg:col-start-2" : ""}>
                <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold mb-4">
                  {solution.tag}
                </span>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  {solution.title}
                </h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  {solution.description}
                </p>
                <ul className="space-y-2.5">
                  {solution.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div
                className={`bg-slate-50 rounded-2xl border border-slate-200 h-64 flex items-center justify-center ${
                  solution.reversed ? "lg:col-start-1" : ""
                }`}
              >
                <p className="text-slate-300 text-sm">
                  [Dashboard Preview — {solution.tag}]
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-indigo-700 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white mb-4">
            See the platform in action
          </h2>
          <p className="text-indigo-200 mb-8">
            Request a live walkthrough tailored to your institution's requirements.
          </p>
          <Link href="/request-demo">
            <Button size="xl" className="bg-white text-indigo-700 hover:bg-indigo-50">
              Request Demo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
