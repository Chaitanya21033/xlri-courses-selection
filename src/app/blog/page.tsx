import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import Link from "next/link";

const posts = [
  {
    tag: "Product",
    date: "Mar 2026",
    title: "Why elective course allocation needs a proper bidding system — not a spreadsheet",
    summary: "Most B-schools still manage elective selection through forms, email, and manual curation. Here's why that approach breaks at scale, and what a proper bidding system solves.",
    readTime: "6 min read",
    body: [
      { heading: "The spreadsheet trap", content: "When a cohort is small, a first-come-first-served form works. Someone fills it in, an admin processes it, done. But as cohorts grow past 200 students and elective catalogues expand past 20 courses, the edge cases multiply: students who submit seconds after a form opens get locked out of their preferred courses; oversubscription is resolved by admin discretion with no documented rationale; students from one programme flood courses intended for the other." },
      { heading: "What a bidding system actually solves", content: "A structured bidding system with a fixed point endowment per student creates revealed preference. Students who genuinely want a course more are willing to allocate more points to it. High-demand courses naturally surface a clearing price (MRB). Students can adjust their allocations in real time. The final allocation is defensible, auditable, and consistent." },
      { heading: "The tie-break problem is underappreciated", content: "Even in a well-designed bidding system, ties at the clearing price are inevitable. 30 students bidding 100 points for 20 seats is a tie for seats 21–30. Without a pre-declared tie-break policy, any resolution is arbitrary and opens the institution to grievances. A proper system enforces that tie-break rules are declared before a course enters a live round — and logs every decision with full inputs." },
    ],
  },
  {
    tag: "Operations",
    date: "Feb 2026",
    title: "MRB demystified: how minimum required bids work in a course auction",
    summary: "The MRB (Minimum Required Bid) is the most frequently misunderstood concept in points-based course bidding. Here's a precise explanation of what it is, how it changes, and how students should think about it.",
    readTime: "5 min read",
    body: [
      { heading: "What MRB is", content: "MRB stands for Minimum Required Bid — the current clearing price for a course. If a course has 20 seats and 25 students have bid, the 20th-highest bid becomes the MRB. Any student below that threshold is losing. The MRB can only increase as more students bid or as higher bids are placed." },
      { heading: "What MRB is not", content: "MRB is not the minimum bid you can place. It is the minimum bid required to be in a winning position at that moment. A student who bids 1 point on a course with MRB=80 is valid — they've placed a bid — but they are losing. The system will not prevent them from doing this." },
      { heading: "How to use MRB strategically", content: "Students often ask whether they should bid exactly at MRB. The answer depends on how strongly they want the course. A bid at MRB means you're on the margin — any new bid from another student could displace you. A bid above MRB gives you a buffer. The right strategy depends on how many points you have, how many courses you're bidding on, and how oversubscribed each course is." },
    ],
  },
  {
    tag: "Design",
    date: "Jan 2026",
    title: "Designing for fairness: the architecture of BidScholar's allocation engine",
    summary: "A walkthrough of the technical and logical architecture behind BidScholar's allocation engine — from bid submission to tie-break resolution to point reimbursement.",
    readTime: "8 min read",
    body: [
      { heading: "Discriminatory-price auction with configurable tie-breaks", content: "BidScholar implements a discriminatory-price sealed-bid auction: each student pays their own bid amount, not the clearing price. This means a student who bid 150 and won pays 150 — not the MRB of 100 that a student who just squeaked in at the clearing price paid. This design rewards genuine preference strength and simplifies clearing logic." },
      { heading: "The allocation pipeline", content: "When a round closes, the admin triggers the allocation engine. For each course: (1) collect all active bids sorted by points descending; (2) fill seats up to seatCap; (3) if a tie occurs at the clearing line, apply the pre-declared tie-break policy; (4) mark winners TENTATIVE, losers REIMBURSED; (5) update point accounts; (6) log everything. The pipeline is transactional: partial failures are caught and logged without corrupting the allocation state." },
      { heading: "Tie-break resolution", content: "Five tie-break methods are supported: CQPI_DESC (sort by cumulative GPA), GRADE_DESC (sort by grade in a specified prerequisite), COMPOSITE_RANK (weighted combination of CQPI and grade), LOTTERY (random with reproducible seed), and MANUAL_RANK (pre-uploaded ranked list). The method must be declared before a round opens. Once declared and locked, it cannot be changed without explicit admin override — which itself creates an audit log entry." },
    ],
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main>
        {/* Hero */}
        <section className="bg-slate-900 text-white py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-indigo-400 font-medium text-sm uppercase tracking-widest mb-4">Insights</p>
            <h1 className="text-4xl font-bold leading-tight mb-6">
              Thinking about elective allocation
            </h1>
            <p className="text-slate-300 text-lg max-w-2xl">
              Product notes, domain explainers, and operational guidance for academic administrators
              and students navigating points-based course bidding.
            </p>
          </div>
        </section>

        {/* Posts */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto space-y-12">
            {posts.map((post, i) => (
              <article key={i} className="border-t border-slate-100 pt-10 first:border-t-0 first:pt-0">
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full">
                    {post.tag}
                  </span>
                  <span className="text-xs text-slate-400">{post.date}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400">{post.readTime}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">{post.title}</h2>
                <p className="text-slate-600 leading-relaxed mb-6">{post.summary}</p>

                <div className="space-y-5 border-l-2 border-slate-100 pl-5">
                  {post.body.map(section => (
                    <div key={section.heading}>
                      <h3 className="font-semibold text-slate-800 mb-1">{section.heading}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{section.content}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 px-6 bg-slate-50 border-t border-slate-200 text-center">
          <div className="max-w-xl mx-auto">
            <p className="text-slate-600 mb-4">Want to discuss your institution's allocation process?</p>
            <Link
              href="/request-demo"
              className="inline-flex items-center justify-center px-6 py-3 bg-indigo-700 text-white font-semibold rounded-xl hover:bg-indigo-800 transition-colors"
            >
              Get in touch
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
