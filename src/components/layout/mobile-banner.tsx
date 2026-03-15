"use client";

import { useState } from "react";
import { Monitor, X } from "lucide-react";

/**
 * Shows a dismissible warning on small screens recommending desktop use.
 * Only visible on screens narrower than the `md` breakpoint.
 */
export function MobileBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="md:hidden flex items-start gap-3 bg-amber-50 border-b border-amber-200 px-4 py-3 text-sm text-amber-800">
      <Monitor className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
      <p className="flex-1">
        <strong>Desktop recommended.</strong> The bidding portal is optimised for larger screens.
        Some features may be difficult to use on mobile.
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-500 hover:text-amber-700"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
