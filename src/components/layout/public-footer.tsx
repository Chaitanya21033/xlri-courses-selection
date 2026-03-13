import Link from "next/link";
import { BookOpen } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-white text-lg">BidScholar</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-500 max-w-xs">
              Institutional-grade elective course bidding for business schools and
              graduate management programmes. Built for fairness, auditability,
              and operational efficiency.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400">
                Market-based allocation
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400">
                Audit-ready
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400">
                Role-based access
              </span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/solutions" className="hover:text-white transition-colors">Solutions</Link></li>
              <li><Link href="/case-studies" className="hover:text-white transition-colors">Case Studies</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Insights</Link></li>
              <li><Link href="/request-demo" className="hover:text-white transition-colors">Request Demo</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link href="/faq#mrb" className="hover:text-white transition-colors">Understanding MRB</Link></li>
              <li><Link href="/faq#bidpoints" className="hover:text-white transition-colors">Bid Points Guide</Link></li>
              <li><Link href="/faq#tiebreak" className="hover:text-white transition-colors">Tie-break Policies</Link></li>
              <li><Link href="/auth/login" className="hover:text-white transition-colors">Portal Login</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/about#team" className="hover:text-white transition-colors">Team</Link></li>
              <li><Link href="/about#contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li>
                <a
                  href="mailto:hello@bidscholar.io"
                  className="hover:text-white transition-colors"
                >
                  hello@bidscholar.io
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} BidScholar. All rights reserved.
          </p>
          <div className="flex gap-5 text-xs">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">
              Terms of Use
            </Link>
            <Link href="/cookies" className="hover:text-slate-300 transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
