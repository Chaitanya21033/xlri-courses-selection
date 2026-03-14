import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import Link from "next/link";

const caseStudies = [
  {
    tag: "Allocation Efficiency",
    title: "From 3 weeks to 4 hours: Term 3 elective bidding at a tier-1 management school",
    institution: "Composite example — tier-1 B-school, India",
    summary: "A post-graduate management programme with 600 students and 30 elective courses completed its entire elective allocation cycle — including two bidding rounds, tie-break resolution for 6 oversubscribed courses, and a confirmation round — in under 4 hours.",
    stats: [
      { label: "Students", value: "600" },
      { label: "Electives", value: "30" },
      { label: "Allocation time", value: "4 hrs" },
      { label: "Grievances filed", value: "0" },
    ],
    detail: [
      { heading: "The problem", body: "The previous process involved a Google Form, an Excel tracker maintained by one admin, and a 3-week back-and-forth to resolve oversubscription manually. With seat caps, programme-eligibility rules, and CQPI-based priority, the process was error-prone and contentious." },
      { heading: "The approach", body: "Two standard bidding rounds were configured: Round 1 with programme-specific quota enforcement, Round 2 with relaxed quotas for remaining seats. Each course had a CQPI-descending tie-break policy declared before bidding opened. No course was allowed to enter Round 1 without a declared tie-break rule." },
      { heading: "The outcome", body: "Allocation ran via the bidding engine in minutes. Students received real-time MRB updates during the open window. Post-close, allocation results were available instantly. Zero manual overrides were required. The complete audit log was exported for records." },
    ],
  },
  {
    tag: "Cross-Programme Bidding",
    title: "Managing cross-programme elective demand between BM and HRM cohorts",
    institution: "Composite example — dual-programme B-school",
    summary: "A school offering separate BM and HRM tracks wanted to share 8 high-demand electives across both cohorts while maintaining programme-specific seat quotas in Round 1.",
    stats: [
      { label: "Shared courses", value: "8" },
      { label: "BM students", value: "360" },
      { label: "HRM students", value: "240" },
      { label: "Quota violations", value: "0" },
    ],
    detail: [
      { heading: "The problem", body: "Without system support, cross-programme courses were often dominated by the larger BM cohort. HRM students felt underserved in popular electives like Entrepreneurship and Digital Marketing." },
      { heading: "The approach", body: "Cross-programme eligibility was enabled at the cycle level. QuotaRule records were set per offering per round: in Round 1, each cohort was limited to its proportional share of seats. In Round 2, remaining seats were opened to any eligible student regardless of programme." },
      { heading: "The outcome", body: "Both cohorts received fair access in Round 1. Seats left unfilled after Round 1 were reallocated in Round 2 by bid strength. The process was fully auditable and reproducible for the next term." },
    ],
  },
  {
    tag: "Tie-break Governance",
    title: "Handling oversubscription ties with a pre-declared composite ranking policy",
    institution: "Composite example — research-oriented B-school",
    summary: "A data analytics elective with 25 seats received 73 bids at the clearing price, requiring tie-break resolution across 48 tied students. The COMPOSITE_RANK method — a weighted combination of CQPI (60%) and prerequisite course grade (40%) — was applied automatically.",
    stats: [
      { label: "Seats", value: "25" },
      { label: "Tied students", value: "48" },
      { label: "Resolution time", value: "< 1 sec" },
      { label: "Audit trail", value: "Complete" },
    ],
    detail: [
      { heading: "The problem", body: "In a previous cohort, a tie at the clearing price affected 31 students. The manual resolution process took 2 days and resulted in a formal grievance. The institution needed a predeclared, rule-based, auditable tie-break method." },
      { heading: "The approach", body: "The professor declared a COMPOSITE_RANK tie-break policy with weights {cqpi: 0.6, grade: 0.4} before bidding opened. Students could see this policy in the course catalog before placing bids. When bidding closed, the engine applied the policy automatically and logged each tie-break decision with full inputs." },
      { heading: "The outcome", body: "48 tied students were ranked in milliseconds. All 48 could see their outcome and the inputs used to rank them. No grievances were filed. The pre-declaration principle — every course must declare its tie-break rule before entering a live round — was institutionalised." },
    ],
  },
];

export default function CaseStudiesPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main>
        {/* Hero */}
        <section className="bg-slate-900 text-white py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-indigo-400 font-medium text-sm uppercase tracking-widest mb-4">Results</p>
            <h1 className="text-4xl font-bold leading-tight mb-6">
              How B-schools have used BidScholar
            </h1>
            <p className="text-slate-300 text-lg max-w-2xl">
              Illustrative examples showing how institutions have structured their elective bidding cycles,
              handled edge cases, and improved the student experience.
            </p>
          </div>
        </section>

        {/* Case studies */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto space-y-16">
            {caseStudies.map((cs, i) => (
              <article key={i} className="border-t border-slate-100 pt-12 first:border-t-0 first:pt-0">
                <span className="inline-flex px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full mb-4">
                  {cs.tag}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{cs.title}</h2>
                <p className="text-slate-400 text-sm mb-4">{cs.institution}</p>
                <p className="text-slate-600 leading-relaxed mb-8">{cs.summary}</p>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                  {cs.stats.map(s => (
                    <div key={s.label} className="p-4 bg-slate-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-indigo-700">{s.value}</p>
                      <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Detail */}
                <div className="grid lg:grid-cols-3 gap-6">
                  {cs.detail.map(d => (
                    <div key={d.heading} className="p-5 border border-slate-200 rounded-xl">
                      <h3 className="font-semibold text-slate-800 mb-2">{d.heading}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{d.body}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-6 bg-indigo-700 text-white text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Run your own bidding cycle</h2>
            <p className="text-indigo-200 mb-8">
              All scenarios above are achievable with the platform out of the box. Request a demo with your institution's specific requirements.
            </p>
            <Link
              href="/request-demo"
              className="inline-flex items-center justify-center px-6 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Request Demo
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
