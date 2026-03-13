import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

const faqSections = [
  {
    id: "bidpoints",
    title: "Bid Points & Budget",
    questions: [
      {
        q: "How many bid points do I receive?",
        a: "Each student receives a fixed allocation of bid points for the bidding cycle, configured by the institution. Typically this is 1,000 points per cycle. Your point balance is visible on your dashboard.",
      },
      {
        q: "Can I carry forward unused points to the next round?",
        a: "Carry-forward of bid points is an institute-level policy. If enabled, unused points from one round roll over to the next. If disabled, each round starts fresh. Check the active cycle settings on your dashboard.",
      },
      {
        q: "What happens to points from losing bids?",
        a: "Points allocated to losing bids are automatically reimbursed after allocation runs. They return to your available balance and can be used in subsequent rounds or to increase bids on remaining courses.",
      },
      {
        q: "Can I exhaust all my bid points?",
        a: "Yes. You can allocate your entire point budget across courses. However, consider the risk — if all your bids lose, you may end up with fewer electives than required. We recommend spreading bids strategically.",
      },
    ],
  },
  {
    id: "mrb",
    title: "MRB (Minimum Required Bid)",
    questions: [
      {
        q: "What is MRB?",
        a: "MRB stands for Minimum Required Bid — the current clearing price for a course. It represents the lowest bid among the current provisional winners. To be in the winning set, your bid must be at or above the MRB.",
      },
      {
        q: "How does MRB change during bidding?",
        a: "MRB is recomputed dynamically as students place or update bids. If more students bid on a course, the MRB rises (the competition for seats increases). If students withdraw, the MRB may fall. MRB is always ≥ 0.",
      },
      {
        q: "Can a course have MRB = 0?",
        a: "Yes. If a course is undersubscribed (fewer bids than seats), the MRB is 0 — all bidders win a seat regardless of their bid points. If the institute policy requires a minimum 1-point bid, this is enforced before allocation.",
      },
      {
        q: "Can I reduce my bid below the MRB?",
        a: "You can only reduce a bid down to the current MRB level. Bids cannot be set below MRB while you are in the winning set. If MRB is 0, you can reduce to 0 and then withdraw if you choose.",
      },
    ],
  },
  {
    id: "withdrawals",
    title: "Withdrawals & Changes",
    questions: [
      {
        q: "Can I withdraw my bid during the bidding round?",
        a: "You can withdraw from a course you are currently losing at any time — your points are reimbursed. You cannot directly withdraw from a course you are currently winning unless your bid points are 0 (only possible if MRB = 0).",
      },
      {
        q: "Can I withdraw after the round closes?",
        a: "Yes. During the confirmation round (a post-close window), you may withdraw from confirmed allocations. This gives you a final opportunity to release a seat before enrolment is locked.",
      },
      {
        q: "What if I need to change my bid amount?",
        a: "You can update your bid to any value ≥ MRB at any time while the round is open. You can also reduce your bid, subject to MRB limits. All changes are logged with a timestamp.",
      },
    ],
  },
  {
    id: "tiebreak",
    title: "Tie-break Policies",
    questions: [
      {
        q: "What happens when multiple students bid the same amount at the cutoff?",
        a: "When more students bid at the clearing price than there are remaining seats, a tie-break is applied. The tie-break method is declared by the professor before bidding opens — it can be CQPI ranking, grades in a prerequisite course, a manual ranked list, or a lottery.",
      },
      {
        q: "Can I see the tie-break policy before I bid?",
        a: "Yes. Every course displays its declared tie-break policy in the course detail view. You can see whether the course uses CQPI, prerequisite grades, composite ranking, or lottery before placing your bid.",
      },
      {
        q: "What if a course has no tie-break policy?",
        a: "Courses without a declared tie-break policy cannot enter an active bidding round. Administrators are blocked from opening a round if any course is missing this declaration. This is a hard system gate.",
      },
      {
        q: "Is the tie-break outcome auditable?",
        a: "Yes. All tie-break decisions are logged in the platform's audit trail, including which method was used, the input values (e.g. CQPI scores), and the resulting ranking. Students can see whether their allocation was tie-broken.",
      },
    ],
  },
  {
    id: "eligibility",
    title: "Eligibility & Programmes",
    questions: [
      {
        q: "Can I see courses I'm not eligible for?",
        a: "No. The catalog is filtered server-side based on your programme (BM or HRM). You will only see courses for which you are eligible. Attempting to bid on an ineligible course via any means will be rejected by the server.",
      },
      {
        q: "What does 'BOTH' eligibility mean?",
        a: "Courses marked as eligible for 'BOTH' accept bids from both BM and HRM students. Seats are competed for jointly unless cross-programme quota rules further restrict allocations by round.",
      },
      {
        q: "What is the cross-programme quota?",
        a: "In cross-programme mode (if enabled), Round 1 may reserve some seats for each batch. In Round 2 (quota relaxed), remaining seats are opened to all eligible students. This ensures balanced access before full competition begins.",
      },
    ],
  },
  {
    id: "login",
    title: "Login & Access Issues",
    questions: [
      {
        q: "I can't log in. What should I do?",
        a: "First, ensure you're using your institutional email and the password provided by your programme office. If you've recently changed your password or believe your account is new, contact your institute's admin team. Use a desktop browser (Chrome or Firefox recommended) for best results.",
      },
      {
        q: "Why is the portal not loading properly?",
        a: "The bidding portal is optimised for desktop browsers. If you're on mobile, some features may be limited. Disable browser extensions (especially ad-blockers) and clear cache if you encounter display issues.",
      },
      {
        q: "My account says 'inactive'. Who do I contact?",
        a: "Inactive accounts are managed by your programme administrator. Contact the admin team directly to reactivate your account before the bidding deadline.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />

      {/* Header */}
      <section className="bg-slate-900 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-indigo-400 text-sm font-semibold uppercase tracking-wider mb-3">
            Help Centre
          </p>
          <h1 className="text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-slate-400 text-lg">
            Everything you need to understand the bidding process, MRB, tie-breaks, withdrawals, and eligibility rules.
          </p>
        </div>
      </section>

      {/* Quick jump */}
      <section className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap gap-2">
            {faqSections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-xs font-medium text-slate-600 hover:text-indigo-700 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 transition-colors"
              >
                {s.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {faqSections.map((section) => (
            <div key={section.id} id={section.id}>
              <h2 className="text-xl font-bold text-slate-900 mb-6 pb-3 border-b border-slate-200">
                {section.title}
              </h2>
              <div className="space-y-6">
                {section.questions.map((qa, i) => (
                  <div key={i} className="group">
                    <h3 className="font-semibold text-slate-900 mb-2 text-base">
                      {qa.q}
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                      {qa.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Still need help */}
      <section className="py-16 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Still have questions?
          </h2>
          <p className="text-slate-600 mb-6">
            Contact your programme administrator or reach out to the BidScholar support team.
          </p>
          <a
            href="mailto:support@bidscholar.io"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-700 text-white text-sm font-medium hover:bg-indigo-800 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
