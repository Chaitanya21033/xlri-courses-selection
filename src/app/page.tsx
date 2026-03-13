import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Shield,
  Zap,
  Users,
  CheckCircle2,
  ArrowRight,
  Clock,
  Scale,
} from "lucide-react";

const features = [
  {
    icon: Scale,
    title: "Transparent Allocation",
    description:
      "Every allocation decision is governed by pre-declared rules. Students see the tie-break policy before bidding — no hidden criteria, no surprises.",
  },
  {
    icon: Zap,
    title: "Real-time MRB Updates",
    description:
      "The Minimum Required Bid (clearing price) updates dynamically as bids come in. Students can respond strategically with full visibility.",
  },
  {
    icon: Shield,
    title: "Audit-ready by Design",
    description:
      "Every bid, withdrawal, reimbursement, and override is logged with actor, timestamp, and IP. Compliance-grade record-keeping built-in.",
  },
  {
    icon: Users,
    title: "Cross-programme Logic",
    description:
      "Support BM-only, HRM-only, and joint eligibility. Configurable quota rules enable two-stage cross-programme allocation.",
  },
  {
    icon: BarChart3,
    title: "Demand Analytics",
    description:
      "Administrators get real-time demand dashboards. See oversubscribed courses, undersubscribed courses, and seat utilization at a glance.",
  },
  {
    icon: Clock,
    title: "Flexible Round Configuration",
    description:
      "Configure multiple bidding rounds, confirmation rounds, and carry-forward point policies. Every cycle is independently configurable.",
  },
];

const steps = [
  {
    step: "01",
    title: "Admin configures the cycle",
    description:
      "Set up the academic term, total bid points per student, round schedule, cross-programme quotas, and eligibility rules.",
  },
  {
    step: "02",
    title: "Professors define their courses",
    description:
      "Faculty upload course details, set seat caps, define eligibility, and declare tie-break policies before the round opens.",
  },
  {
    step: "03",
    title: "Students bid on electives",
    description:
      "Students see eligible courses, monitor MRB, allocate bid points, and adjust bids in real time during the open round.",
  },
  {
    step: "04",
    title: "Engine allocates and audits",
    description:
      "At round close, the allocation engine runs, tie-breaks are resolved transparently, and results are published with full audit trail.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.15)_0%,_transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-8">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Institutional-grade bidding infrastructure
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Elective allocation
              <br />
              <span className="text-indigo-400">done right.</span>
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed mb-10 max-w-2xl">
              BidScholar replaces spreadsheets and manual allocation with a
              transparent, market-based bidding platform designed for the
              rigour of graduate management education.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/request-demo">
                <Button variant="primary" size="xl" className="w-full sm:w-auto">
                  Request a Demo
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button
                  size="xl"
                  className="w-full sm:w-auto bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Access Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="relative border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { value: "600+", label: "Students per cycle" },
                { value: "30+", label: "Elective courses" },
                { value: "< 2hr", label: "Allocation time" },
                { value: "100%", label: "Decisions auditable" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">
                The Problem
              </p>
              <h2 className="text-4xl font-bold text-slate-900 leading-tight mb-6">
                Manual elective allocation is broken.
              </h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  Most business schools still run elective allocation through
                  spreadsheets, email chains, and manual adjudication. The result:
                  weeks of delays, opaque decisions, student dissatisfaction, and
                  poor seat utilization.
                </p>
                <p>
                  When tie-break criteria are unclear, when seat caps change
                  mid-process, or when batch eligibility rules are inconsistently
                  applied — students lose trust in the process. Faculty waste time
                  on administrative overhead instead of teaching.
                </p>
                <p>
                  A school that prides itself on analytical rigour deserves
                  allocation infrastructure that matches that standard.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: "Allocation cycle time", before: "2–3 weeks", after: "Under 2 hours" },
                { label: "Decision transparency", before: "Ad-hoc, opaque", after: "Pre-declared, audited" },
                { label: "Student disputes", before: "Frequent, unresolved", after: "Rare, all explained" },
                { label: "Seat utilization", before: "~70%", after: "> 90%" },
              ].map((row) => (
                <div key={row.label} className="flex items-stretch gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{row.label}</p>
                    <div className="flex gap-4">
                      <div className="flex-1 text-center p-2 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-500 font-medium">Before</p>
                        <p className="text-sm font-semibold text-red-700 mt-1">{row.before}</p>
                      </div>
                      <div className="flex items-center text-slate-300 text-xs">→</div>
                      <div className="flex-1 text-center p-2 bg-emerald-50 rounded-lg">
                        <p className="text-xs text-emerald-500 font-medium">After</p>
                        <p className="text-sm font-semibold text-emerald-700 mt-1">{row.after}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">Platform Capabilities</p>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Built for institutional complexity</h2>
            <p className="text-lg text-slate-600">
              Every feature is designed around the real constraints of business school administration:
              batch eligibility, cross-programme quotas, tie-break auditability, and multi-round allocation cycles.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white rounded-xl p-6 border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">How It Works</p>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Four steps from setup to results</h2>
          </div>
          <div className="relative">
            <div className="hidden lg:block absolute top-10 left-[calc(12.5%+20px)] right-[calc(12.5%+20px)] h-px bg-slate-200" />
            <div className="grid lg:grid-cols-4 gap-8">
              {steps.map((step) => (
                <div key={step.step} className="relative text-center">
                  <div className="h-14 w-14 rounded-full bg-indigo-700 text-white flex items-center justify-center text-lg font-bold mx-auto mb-4 relative z-10">
                    {step.step}
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Role overview */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-3">Role-based Platform</p>
            <h2 className="text-4xl font-bold text-white mb-4">Every stakeholder, purpose-built</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                role: "Administrator",
                color: "border-indigo-500",
                tagColor: "bg-indigo-500/10 text-indigo-400",
                capabilities: [
                  "Configure cycles, rounds & policies",
                  "Import students and faculty",
                  "Open / close bidding rounds",
                  "Run allocation engine",
                  "Override allocations with audit trail",
                  "View demand analytics & reports",
                ],
              },
              {
                role: "Faculty",
                color: "border-emerald-500",
                tagColor: "bg-emerald-500/10 text-emerald-400",
                capabilities: [
                  "Create & update course details",
                  "Set seat capacity & eligibility",
                  "Define tie-break policy (required)",
                  "Monitor live demand for their course",
                  "View provisional & final allocations",
                  "Upload course materials & notes",
                ],
              },
              {
                role: "Student",
                color: "border-amber-500",
                tagColor: "bg-amber-500/10 text-amber-400",
                capabilities: [
                  "Browse eligible electives only",
                  "Monitor MRB and demand signals",
                  "Allocate & edit bid points",
                  "Withdraw from bids per rules",
                  "Track real-time win/lose status",
                  "Download final allocation summary",
                ],
              },
            ].map((role) => (
              <div key={role.role} className={`bg-slate-800 rounded-xl p-6 border-t-2 ${role.color}`}>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 ${role.tagColor}`}>
                  {role.role}
                </span>
                <ul className="space-y-2.5">
                  {role.capabilities.map((cap) => (
                    <li key={cap} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-indigo-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to modernise your elective allocation?
          </h2>
          <p className="text-xl text-indigo-200 mb-10 leading-relaxed">
            See how BidScholar can cut your allocation cycle from weeks to hours while giving every stakeholder the transparency they deserve.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/request-demo">
              <Button size="xl" className="bg-white text-indigo-700 hover:bg-indigo-50 w-full sm:w-auto">
                Request a Demo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="xl" className="border border-white/30 text-white hover:bg-white/10 bg-transparent w-full sm:w-auto">
                Try Demo Portal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
