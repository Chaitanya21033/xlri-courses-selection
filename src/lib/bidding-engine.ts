/**
 * Bidding Engine
 *
 * Core auction/allocation logic for the course bidding platform.
 *
 * Auction model:
 * - Discriminatory-price auction (each winner pays their own bid)
 * - MRB = current minimum bid required to be in the winning set
 * - Seats fill from highest bid down until seat cap is reached
 * - Ties at the clearing line require pre-declared tie-break resolution
 *
 * Tie-break methods (in priority order as configured per course):
 *   CQPI_DESC       → higher CQPI wins
 *   GRADE_DESC      → higher grade in a specific prerequisite wins
 *   COMPOSITE_RANK  → weighted composite of multiple metrics
 *   MANUAL_RANK     → pre-uploaded ranked list by admin/professor
 *   LOTTERY         → random draw (deterministic seed for auditability)
 */

import { db } from "./db";
import {
  BID_STATUS,
  ALLOCATION_STATUS,
  TIE_BREAK_METHOD,
  AUDIT_ACTION,
  BIDDING_ROUND_STATUS,
  COURSE_STATUS,
} from "./constants";

export interface BidRecord {
  userId: string;
  studentProfileId: string;
  offeringId: string;
  points: number;
  cqpi: number;
  prerequisiteGrade?: number;
  compositeRank?: number;
  manualRank?: number;
}

export interface AllocationDecision {
  studentProfileId: string;
  userId: string;
  offeringId: string;
  status: "WINNING" | "LOSING";
  finalPoints: number;
  tieBroken: boolean;
  tieBreakRank?: number;
}

export interface MRBResult {
  mrb: number;
  winnersCount: number;
  losersCount: number;
}

/**
 * Compute MRB and preliminary winner set for a course offering.
 *
 * Algorithm:
 * 1. Sort bids descending by points
 * 2. Take top seatCap bids as provisional winners
 * 3. If there are ties at the boundary, mark them as needing tie-break
 * 4. MRB = lowest winning bid points (or 0 if demand < seats)
 */
export function computeMRB(
  bids: BidRecord[],
  seatCap: number,
  minBidRequired: boolean
): MRBResult {
  if (bids.length === 0) {
    return { mrb: 0, winnersCount: 0, losersCount: 0 };
  }

  const sorted = [...bids].sort((a, b) => b.points - a.points);

  // If demand <= seats, all qualify; MRB = 0 (or 1 if minBidRequired)
  if (sorted.length <= seatCap) {
    return {
      mrb: minBidRequired ? Math.min(...sorted.map((b) => b.points)) || 1 : 0,
      winnersCount: sorted.length,
      losersCount: 0,
    };
  }

  // Find the clearing price: the bid at position seatCap (0-indexed: seatCap-1)
  const cutoffBid = sorted[seatCap - 1];
  const mrb = cutoffBid.points;

  const winners = sorted.filter((b) => b.points >= mrb);
  const losers = sorted.filter((b) => b.points < mrb);

  return {
    mrb,
    winnersCount: Math.min(winners.length, seatCap),
    losersCount: losers.length + Math.max(0, winners.length - seatCap),
  };
}

/**
 * Apply tie-break logic to resolve a tie at the clearing line.
 *
 * Returns ranked list of tied bidders. The top N from this list
 * (where N = remaining seats after non-tied winners) get seats.
 */
export function resolveTieBreak(
  tiedBids: BidRecord[],
  method: string,
  prerequisiteCourseCode?: string | null,
  manualRankJson?: string | null,
  seed?: number
): BidRecord[] {
  const bids = [...tiedBids];

  switch (method) {
    case TIE_BREAK_METHOD.CQPI_DESC:
      return bids.sort((a, b) => b.cqpi - a.cqpi);

    case TIE_BREAK_METHOD.GRADE_DESC:
      return bids.sort(
        (a, b) => (b.prerequisiteGrade ?? 0) - (a.prerequisiteGrade ?? 0)
      );

    case TIE_BREAK_METHOD.COMPOSITE_RANK:
      return bids.sort(
        (a, b) => (a.compositeRank ?? 9999) - (b.compositeRank ?? 9999)
      );

    case TIE_BREAK_METHOD.MANUAL_RANK: {
      if (!manualRankJson) return bids;
      const ranks: Array<{ studentId: string; rank: number }> =
        JSON.parse(manualRankJson);
      const rankMap = new Map(ranks.map((r) => [r.studentId, r.rank]));
      return bids.sort(
        (a, b) =>
          (rankMap.get(a.studentProfileId) ?? 9999) -
          (rankMap.get(b.studentProfileId) ?? 9999)
      );
    }

    case TIE_BREAK_METHOD.LOTTERY: {
      // Deterministic shuffle using seed (for auditability)
      const s = seed ?? 42;
      return bids.sort((a, b) => {
        const hashA =
          (a.studentProfileId
            .split("")
            .reduce((acc, c) => acc + c.charCodeAt(0), 0) *
            s) %
          10000;
        const hashB =
          (b.studentProfileId
            .split("")
            .reduce((acc, c) => acc + c.charCodeAt(0), 0) *
            s) %
          10000;
        return hashA - hashB;
      });
    }

    default:
      return bids;
  }
}

/**
 * Full allocation run for a single course offering.
 *
 * Returns the complete list of AllocationDecision records.
 * This must be called within a transaction.
 */
export async function allocateCourse(
  offeringId: string,
  roundId: string,
  adminUserId: string
): Promise<AllocationDecision[]> {
  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: {
      tieBreakPolicy: true,
      course: true,
    },
  });

  if (!offering) throw new Error(`Offering ${offeringId} not found`);
  if (!offering.tieBreakPolicy) {
    throw new Error(
      `Course ${offering.course.code} cannot be allocated: no tie-break policy defined`
    );
  }

  const bidsRaw = await db.bid.findMany({
    where: {
      offeringId,
      roundId,
      status: { in: [BID_STATUS.ACTIVE, BID_STATUS.WINNING] },
    },
    include: {
      user: {
        include: {
          studentProfile: {
            include: { courseGrades: true },
          },
        },
      },
    },
  });

  // Build enriched bid records
  const bids: BidRecord[] = bidsRaw.map((b) => {
    const sp = b.user.studentProfile!;
    const preqGrade = sp.courseGrades.find(
      (g) =>
        g.courseCode ===
        offering.tieBreakPolicy?.prerequisiteCourseCode
    )?.grade;

    return {
      userId: b.userId,
      studentProfileId: sp.id,
      offeringId,
      points: b.points,
      cqpi: sp.cqpi,
      prerequisiteGrade: preqGrade,
    };
  });

  const seatCap = offering.seatCap;
  const decisions: AllocationDecision[] = [];

  if (bids.length === 0) {
    return decisions;
  }

  const sorted = [...bids].sort((a, b) => b.points - a.points);

  // Separate clear winners (above tie boundary) from tied boundary group
  let clearWinners: BidRecord[] = [];
  let tiedAtBoundary: BidRecord[] = [];
  let clearLosers: BidRecord[] = [];

  if (sorted.length <= seatCap) {
    // Under-subscribed: all get seats
    clearWinners = sorted;
  } else {
    const cutoffPoints = sorted[seatCap - 1].points;
    const aboveCutoff = sorted.filter((b) => b.points > cutoffPoints);
    const atCutoff = sorted.filter((b) => b.points === cutoffPoints);
    const belowCutoff = sorted.filter((b) => b.points < cutoffPoints);

    const seatsForTied = seatCap - aboveCutoff.length;

    if (seatsForTied <= 0) {
      // All seats taken by above-cutoff bidders; all tied bidders are losers
      clearWinners = aboveCutoff.slice(0, seatCap);
      clearLosers = [...atCutoff, ...belowCutoff];
    } else if (seatsForTied >= atCutoff.length) {
      // Enough seats for all tied bidders too
      clearWinners = [...aboveCutoff, ...atCutoff];
      clearLosers = belowCutoff;
    } else {
      // Need to apply tie-break among atCutoff
      clearWinners = aboveCutoff;
      tiedAtBoundary = atCutoff;
      clearLosers = belowCutoff;

      // Apply tie-break
      const ranked = resolveTieBreak(
        tiedAtBoundary,
        offering.tieBreakPolicy.method,
        offering.tieBreakPolicy.prerequisiteCourseCode,
        offering.tieBreakPolicy.manualRankJson,
        parseInt(offeringId.slice(-4), 36) // deterministic seed from id
      );

      const tiedWinners = ranked.slice(0, seatsForTied);
      const tiedLosers = ranked.slice(seatsForTied);

      tiedWinners.forEach((b, i) => {
        decisions.push({
          studentProfileId: b.studentProfileId,
          userId: b.userId,
          offeringId,
          status: "WINNING",
          finalPoints: b.points,
          tieBroken: true,
          tieBreakRank: i + 1,
        });
      });

      tiedLosers.forEach((b, i) => {
        decisions.push({
          studentProfileId: b.studentProfileId,
          userId: b.userId,
          offeringId,
          status: "LOSING",
          finalPoints: b.points,
          tieBroken: true,
          tieBreakRank: seatsForTied + i + 1,
        });
      });
    }
  }

  clearWinners.forEach((b) => {
    decisions.push({
      studentProfileId: b.studentProfileId,
      userId: b.userId,
      offeringId,
      status: "WINNING",
      finalPoints: b.points,
      tieBroken: false,
    });
  });

  clearLosers.forEach((b) => {
    decisions.push({
      studentProfileId: b.studentProfileId,
      userId: b.userId,
      offeringId,
      status: "LOSING",
      finalPoints: b.points,
      tieBroken: false,
    });
  });

  return decisions;
}

/**
 * Recompute MRB for a course offering in real-time.
 * Called whenever a bid is placed/updated/withdrawn.
 */
export async function recomputeOfferingMRB(
  offeringId: string,
  roundId: string,
  minBidRequired: boolean
): Promise<number> {
  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
  });
  if (!offering) return 0;

  const activeBids = await db.bid.findMany({
    where: {
      offeringId,
      roundId,
      status: { in: [BID_STATUS.ACTIVE] },
    },
  });

  const bidRecords: BidRecord[] = activeBids.map((b) => ({
    userId: b.userId,
    studentProfileId: "",
    offeringId,
    points: b.points,
    cqpi: 0,
  }));

  const result = computeMRB(bidRecords, offering.seatCap, minBidRequired);

  // Update offering MRB
  await db.courseOffering.update({
    where: { id: offeringId },
    data: { mrb: result.mrb },
  });

  return result.mrb;
}

/**
 * Validate that a student can place/update a bid.
 * Server-side — never trust frontend.
 */
export async function validateBid(
  userId: string,
  offeringId: string,
  roundId: string,
  points: number
): Promise<{ valid: boolean; reason?: string }> {
  // 1. Check offering exists and is open
  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: { cycle: true },
  });
  if (!offering || offering.status !== COURSE_STATUS.BIDDING_OPEN) {
    return { valid: false, reason: "Course is not open for bidding." };
  }

  // 2. Check round is open
  const round = await db.biddingRound.findUnique({ where: { id: roundId } });
  if (!round || round.status !== BIDDING_ROUND_STATUS.OPEN) {
    return { valid: false, reason: "Bidding round is not open." };
  }

  // 3. Check student eligibility
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { studentProfile: true },
  });
  if (!user?.studentProfile) {
    return { valid: false, reason: "Student profile not found." };
  }

  const sp = user.studentProfile;
  if (
    offering.eligibility !== "BOTH" &&
    offering.eligibility !== sp.programme
  ) {
    return {
      valid: false,
      reason: "You are not eligible for this course.",
    };
  }

  // 4. Check minimum bid
  if (offering.cycle.minBidRequired && points < 1) {
    return {
      valid: false,
      reason: "Minimum 1 bid point is required for this cycle.",
    };
  }

  // 5. Check points don't go below MRB (when reducing)
  const existingBid = await db.bid.findUnique({
    where: {
      userId_offeringId_roundId: { userId, offeringId, roundId },
    },
  });
  if (existingBid && points < offering.mrb && points !== 0) {
    return {
      valid: false,
      reason: `Bid cannot be below MRB of ${offering.mrb} points.`,
    };
  }

  // 6. Check available points in account
  const pointAccount = await db.pointAccount.findUnique({
    where: {
      studentProfileId_cycleId: {
        studentProfileId: sp.id,
        cycleId: offering.cycleId,
      },
    },
  });
  if (!pointAccount) {
    return { valid: false, reason: "Point account not found." };
  }

  const currentBidPoints = existingBid?.points ?? 0;
  const additionalPoints = points - currentBidPoints;
  const available =
    pointAccount.totalPoints - pointAccount.usedPoints - pointAccount.reservedPoints;

  if (additionalPoints > available + currentBidPoints) {
    return {
      valid: false,
      reason: `Insufficient bid points. Available: ${available + currentBidPoints}`,
    };
  }

  return { valid: true };
}

/**
 * Validate withdrawal rules:
 * - Can always withdraw from a LOSING bid (points reimbursed)
 * - Can withdraw from a WINNING bid only if bid points == 0
 * - If MRB == 0, student can reduce to 0 then withdraw
 */
export async function validateWithdrawal(
  userId: string,
  offeringId: string,
  roundId: string
): Promise<{ valid: boolean; reason?: string }> {
  const bid = await db.bid.findUnique({
    where: {
      userId_offeringId_roundId: { userId, offeringId, roundId },
    },
  });

  if (!bid) {
    return { valid: false, reason: "No active bid found." };
  }

  if (bid.status === BID_STATUS.WINNING && bid.points > 0) {
    return {
      valid: false,
      reason:
        "Cannot withdraw from a winning course with active bid points. Reduce points to 0 first (only if MRB allows).",
    };
  }

  return { valid: true };
}
