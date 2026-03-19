"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getCourseStatusColor, getProgrammeLabel } from "@/lib/utils";
import { Users, BookOpen, Info, FileText } from "lucide-react";

interface CourseCardProps {
  offering: {
    id: string;
    eligibility: string;
    seatCap: number;
    status: string;
    mrb: number;
    requiresSop: boolean;
    sopCharacterLimit: number | null;
    course: { title: string; code: string; credits: number; description?: string | null };
    professor: { user: { name: string } };
    tieBreakPolicy: { method: string } | null;
    _count: { bids: number };
  };
  existingBid?: { points: number; status: string; sopText?: string | null; sopScore?: number | null };
  isRoundOpen: boolean;
  activeRoundId?: string;
  availablePoints: number;
  minBidRequired: boolean;
}

export function CourseCard({
  offering,
  existingBid,
  isRoundOpen,
  activeRoundId,
  availablePoints,
  minBidRequired,
}: CourseCardProps) {
  const router = useRouter();
  const [bidPoints, setBidPoints] = useState<number>(
    existingBid?.points ?? (minBidRequired ? 1 : 0)
  );
  const [sopText, setSopText] = useState<string>(existingBid?.sopText ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const sopCharLimit = offering.sopCharacterLimit ?? 0;
  const sopRemaining = sopCharLimit - sopText.length;

  async function handleBid() {
    if (!activeRoundId) return;
    setLoading(true);
    setError(null);

    // Client-side SOP validation before sending
    if (offering.requiresSop) {
      const trimmed = sopText.trim();
      if (!trimmed) {
        setError("A Statement of Purpose (SOP) is required for this course.");
        setLoading(false);
        return;
      }
      if (sopCharLimit && trimmed.length > sopCharLimit) {
        setError(`SOP exceeds the ${sopCharLimit}-character limit.`);
        setLoading(false);
        return;
      }
    }

    const res = await fetch("/api/student/bids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offeringId: offering.id,
        roundId: activeRoundId,
        points: bidPoints,
        ...(offering.requiresSop ? { sopText: sopText.trim() } : {}),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to place bid");
    } else {
      router.refresh();
    }
  }

  async function handleWithdraw() {
    if (!activeRoundId) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/student/bids/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offeringId: offering.id,
        roundId: activeRoundId,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to withdraw");
    } else {
      router.refresh();
    }
  }

  return (
    <Card
      className={`flex flex-col ${
        existingBid
          ? existingBid.status === "WINNING"
            ? "ring-1 ring-emerald-300"
            : existingBid.status === "LOSING"
            ? "ring-1 ring-red-200"
            : "ring-1 ring-indigo-200"
          : ""
      }`}
    >
      <CardContent className="p-5 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 leading-snug">
              {offering.course.title}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {offering.course.code} · {offering.course.credits} credits
            </p>
          </div>
          {existingBid && (
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                existingBid.status === "WINNING"
                  ? "bg-emerald-100 text-emerald-700"
                  : existingBid.status === "LOSING"
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {existingBid.status}
            </span>
          )}
        </div>

        {/* Faculty & Eligibility */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant="default" className="text-xs">
            <Users className="h-2.5 w-2.5 mr-1" />
            {offering.professor.user.name}
          </Badge>
          <Badge
            variant={
              offering.eligibility === "BOTH"
                ? "info"
                : offering.eligibility === "BM"
                ? "primary"
                : "warning"
            }
          >
            {offering.eligibility}
          </Badge>
          {offering.tieBreakPolicy && (
            <Badge variant="secondary" className="text-xs">
              Tie-break: {offering.tieBreakPolicy.method.replace("_", " ")}
            </Badge>
          )}
        </div>

        {/* Stats — only show seats and MRB, hide bid count from students */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="text-center p-2 rounded-lg bg-slate-50">
            <p className="text-xs text-slate-400">Seats</p>
            <p className="text-sm font-bold text-slate-700">{offering.seatCap}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-indigo-50">
            <p className="text-xs text-indigo-400">MRB</p>
            <p className="text-sm font-bold text-indigo-700">{offering.mrb}</p>
          </div>
        </div>

        {/* Description toggle */}
        {offering.course.description && (
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-3"
          >
            <Info className="h-3 w-3" />
            {showDetail ? "Hide" : "Show"} description
          </button>
        )}
        {showDetail && offering.course.description && (
          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
            {offering.course.description}
          </p>
        )}

        {/* SOP badge for non-open-round view */}
        {offering.requiresSop && !isRoundOpen && (
          <div className="flex items-center gap-1 mb-2">
            <Badge variant="secondary" className="text-xs">
              <FileText className="h-2.5 w-2.5 mr-1" />
              SOP Required
            </Badge>
          </div>
        )}

        {/* Bid section */}
        {isRoundOpen && offering.status === "BIDDING_OPEN" && (
          <div className="mt-auto pt-3 border-t border-slate-100 space-y-3">
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}

            {/* SOP textarea — shown only for SOP-based courses */}
            {offering.requiresSop && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 mb-1">
                  <FileText className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="text-xs font-semibold text-indigo-700">
                    Statement of Purpose <span className="text-red-500">*</span>
                  </span>
                </div>
                <Textarea
                  rows={4}
                  maxLength={sopCharLimit || undefined}
                  value={sopText}
                  onChange={(e) => setSopText(e.target.value)}
                  placeholder="Write your statement of purpose here…"
                  className="text-sm resize-none"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Selection is based on SOP score, not bid points.</span>
                  {sopCharLimit > 0 && (
                    <span className={sopRemaining < 0 ? "text-red-500 font-semibold" : ""}>
                      {sopText.length}/{sopCharLimit}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  min={minBidRequired ? 1 : 0}
                  max={availablePoints + (existingBid?.points ?? 0)}
                  value={bidPoints}
                  onChange={(e) => setBidPoints(parseInt(e.target.value) || 0)}
                  placeholder="Bid points"
                  className="text-sm"
                />
                {offering.mrb > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    Min to win: {offering.mrb} pts
                  </p>
                )}
                {offering.requiresSop && (
                  <p className="text-xs text-slate-400 mt-1">
                    Bid points are not used for ranking on this course.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleBid}
                  disabled={loading}
                  className="text-xs"
                >
                  {existingBid ? "Update" : "Apply"}
                </Button>
                {existingBid && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleWithdraw}
                    disabled={loading}
                    className="text-xs"
                  >
                    Withdraw
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {existingBid && !isRoundOpen && (
          <div className="mt-auto pt-3 border-t border-slate-100 space-y-1">
            {!offering.requiresSop && (
              <p className="text-xs text-slate-500">
                Your bid: <span className="font-semibold text-indigo-700">{existingBid.points} pts</span>
              </p>
            )}
            {offering.requiresSop && existingBid.sopText && (
              <p className="text-xs text-slate-500">
                SOP submitted ·{" "}
                {existingBid.sopScore !== null && existingBid.sopScore !== undefined
                  ? `Score: ${existingBid.sopScore}/100`
                  : "Awaiting score"}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
