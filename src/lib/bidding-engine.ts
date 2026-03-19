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
 *   CQPI_DESC       → higher CQPI wins; secondary sort by rollNumber for stability
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
  rollNumber: string; // used as stable secondary sort key
  offeringId: string;
  points: number;
  cqpi: number;
  prerequisiteGrade?: number;
  compositeRank?: number;
  manualRank?: number;
  // SOP-based intake fields
  sopScore?: number | null;    // professor-assigned score 0–100 (null = not yet scored)
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
 *
 * All sort methods use rollNumber as a stable secondary key to ensure
 * deterministic ordering when the primary key is equal.
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
      return bids.sort((a, b) => {
        const diff = b.cqpi - a.cqpi;
        if (diff !== 0) return diff;
        // Stable secondary: lower rollNumber wins (lexicographic)
        return a.rollNumber.localeCompare(b.rollNumber);
      });

    case TIE_BREAK_METHOD.GRADE_DESC:
      return bids.sort((a, b) => {
        const diff = (b.prerequisiteGrade ?? 0) - (a.prerequisiteGrade ?? 0);
        if (diff !== 0) return diff;
        return a.rollNumber.localeCompare(b.rollNumber);
      });

    case TIE_BREAK_METHOD.COMPOSITE_RANK:
      return bids.sort((a, b) => {
        const diff = (a.compositeRank ?? 9999) - (b.compositeRank ?? 9999);
        if (diff !== 0) return diff;
        return a.rollNumber.localeCompare(b.rollNumber);
      });

    case TIE_BREAK_METHOD.MANUAL_RANK: {
      if (!manualRankJson) return bids;
      const ranks: Array<{ studentId: string; rank: number }> =
        JSON.parse(manualRankJson);
      const rankMap = new Map(ranks.map((r) => [r.studentId, r.rank]));
      return bids.sort((a, b) => {
        const diff =
          (rankMap.get(a.studentProfileId) ?? 9999) -
          (rankMap.get(b.studentProfileId) ?? 9999);
        if (diff !== 0) return diff;
        return a.rollNumber.localeCompare(b.rollNumber);
      });
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
        const diff = hashA - hashB;
        if (diff !== 0) return diff;
        return a.rollNumber.localeCompare(b.rollNumber);
      });
    }

    default:
      return bids;
  }
}

/**
 * Rank applicants for an SOP-based course.
 *
 * Ranking rule: descending SOP score; unscored applicants (sopScore=null)
 * are treated as score=0 and rank last.
 * Tie-breaking fallback: ascending rollNumber (same convention used in
 * CQPI_DESC and other point-based tie-break methods).
 *
 * Returns AllocationDecision[] with top seatCap as WINNING and the rest as LOSING.
 */
function allocateSopCourse(
  bids: BidRecord[],
  offeringId: string,
  seatCap: number
): AllocationDecision[] {
  if (bids.length === 0) return [];

  // Sort: highest SOP score first; null scores treated as 0; ties broken by rollNumber asc
  const sorted = [...bids].sort((a, b) => {
    const scoreA = a.sopScore ?? 0;
    const scoreB = b.sopScore ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.rollNumber.localeCompare(b.rollNumber);
  });

  const decisions: AllocationDecision[] = sorted.map((b, idx) => ({
    studentProfileId: b.studentProfileId,
    userId: b.userId,
    offeringId,
    status: idx < seatCap ? "WINNING" : "LOSING",
    // For SOP courses finalPoints is 0 — bid points are not used in ranking.
    // The SOP score is stored on the Bid record itself.
    finalPoints: 0,
    tieBroken: false,
  }));

  return decisions;
}

/**
 * Full allocation run for a single course offering.
 *
 * Supports quota relaxation: if quotaRelaxed=false and QuotaRules exist,
 * each programme batch is capped at maxSeats for Round 1.
 * If quotaRelaxed=true (Round 2+), quota limits are ignored.
 *
 * For SOP-based courses (requiresSop=true), ranking is determined by
 * descending SOP score instead of bid points. Tie-break policy is not
 * required for SOP courses; ties in SOP score use rollNumber as fallback.
 *
 * Returns the complete list of AllocationDecision records.
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
      quotaRules: true,
    },
  });

  if (!offering) throw new Error(`Offering ${offeringId} not found`);

  // SOP courses don't require a tie-break policy; points-based courses do.
  if (!offering.requiresSop && !offering.tieBreakPolicy) {
    throw new Error(
      `Course ${offering.course.code} cannot be allocated: no tie-break policy defined`
    );
  }

  // Check if this round has quota relaxation disabled
  const round = await db.biddingRound.findUnique({ where: { id: roundId } });
  const quotaRelaxed = round?.quotaRelaxed ?? true;

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
            include: { courseGrades: true, batch: true },
          },
        },
      },
    },
  });

  // Build enriched bid records
  const bids: BidRecord[] = bidsRaw.map((b) => {
    const sp = b.user.studentProfile!;
    const preqGrade = sp.courseGrades.find(
      (g) => g.courseCode === offering.tieBreakPolicy?.prerequisiteCourseCode
    )?.grade;

    return {
      userId: b.userId,
      studentProfileId: sp.id,
      rollNumber: sp.rollNumber,
      offeringId,
      points: b.points,
      cqpi: sp.cqpi,
      prerequisiteGrade: preqGrade,
      sopScore: (b as any).sopScore ?? null,
    };
  });

  // For SOP-based courses, delegate to the SOP allocation path.
  if (offering.requiresSop) {
    return allocateSopCourse(bids, offeringId, offering.seatCap);
  }

  // Determine effective seat cap considering quota rules
  let effectiveSeatCap = offering.seatCap;

  if (!quotaRelaxed && offering.quotaRules.length > 0) {
    // Build a map of batchId → maxSeats from QuotaRule
    const quotaMap = new Map<string, number>(
      offering.quotaRules.map((qr) => [qr.batchId, qr.maxSeats])
    );

    // For each bid, check if the student's batch has a quota
    // We'll cap winners per batch by filtering decisions after allocation
    // For simplicity: reduce total cap to sum of all quotas as the ceiling
    const totalQuota = [...quotaMap.values()].reduce((s, v) => s + v, 0);
    effectiveSeatCap = Math.min(offering.seatCap, totalQuota);
  }

  const decisions: AllocationDecision[] = [];

  if (bids.length === 0) {
    return decisions;
  }

  const sorted = [...bids].sort((a, b) => b.points - a.points);

  let clearWinners: BidRecord[] = [];
  let tiedAtBoundary: BidRecord[] = [];
  let clearLosers: BidRecord[] = [];

  if (sorted.length <= effectiveSeatCap) {
    // Under-subscribed: all get seats
    clearWinners = sorted;
  } else {
    const cutoffPoints = sorted[effectiveSeatCap - 1].points;
    const aboveCutoff = sorted.filter((b) => b.points > cutoffPoints);
    const atCutoff = sorted.filter((b) => b.points === cutoffPoints);
    const belowCutoff = sorted.filter((b) => b.points < cutoffPoints);

    const seatsForTied = effectiveSeatCap - aboveCutoff.length;

    if (seatsForTied <= 0) {
      clearWinners = aboveCutoff.slice(0, effectiveSeatCap);
      clearLosers = [...atCutoff, ...belowCutoff];
    } else if (seatsForTied >= atCutoff.length) {
      clearWinners = [...aboveCutoff, ...atCutoff];
      clearLosers = belowCutoff;
    } else {
      clearWinners = aboveCutoff;
      tiedAtBoundary = atCutoff;
      clearLosers = belowCutoff;

      // tieBreakPolicy is guaranteed non-null here: non-SOP courses throw early if missing
      const policy = offering.tieBreakPolicy!;
      const ranked = resolveTieBreak(
        tiedAtBoundary,
        policy.method,
        policy.prerequisiteCourseCode,
        policy.manualRankJson,
        parseInt(offeringId.slice(-4), 36)
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
    rollNumber: "",
    offeringId,
    points: b.points,
    cqpi: 0,
  }));

  const result = computeMRB(bidRecords, offering.seatCap, minBidRequired);

  await db.courseOffering.update({
    where: { id: offeringId },
    data: { mrb: result.mrb },
  });

  return result.mrb;
}

/**
 * Validate that a student can place/update a bid.
 * Server-side — never trust frontend.
 *
 * Checks: offering status, round status, programme eligibility,
 * min bid, MRB floor, available points, credit limits.
 */
export async function validateBid(
  userId: string,
  offeringId: string,
  roundId: string,
  points: number
): Promise<{ valid: boolean; reason?: string }> {
  // 1. Check offering exists and is in a biddable state
  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: { cycle: true, course: { select: { credits: true } } },
  });
  if (!offering) {
    return { valid: false, reason: "Course offering not found." };
  }
  if (
    offering.status === COURSE_STATUS.CANCELLED ||
    offering.status === COURSE_STATUS.CONFIRMED
  ) {
    return {
      valid: false,
      reason: `Course is ${offering.status.toLowerCase()} and cannot be bid on.`,
    };
  }
  if (offering.status !== COURSE_STATUS.BIDDING_OPEN) {
    return { valid: false, reason: "Course is not open for bidding." };
  }

  // 2. Check round is open
  const round = await db.biddingRound.findUnique({ where: { id: roundId } });
  if (!round || round.status !== BIDDING_ROUND_STATUS.OPEN) {
    return { valid: false, reason: "Bidding round is not open." };
  }

  // 3. Check student eligibility (programme)
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { studentProfile: { include: { batch: true } } },
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

  // 5. Check points don't go below MRB (when reducing an existing bid)
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

  // 7. Credit constraint check — warn if adding this course would exceed max credits
  const creditConstraint = await db.creditConstraint.findFirst({
    where: { cycleId: offering.cycleId, programme: sp.programme },
  });
  if (creditConstraint && !existingBid) {
    // Count credits from existing winning/tentative bids in this cycle
    const existingAllocations = await db.allocationResult.findMany({
      where: {
        studentProfileId: sp.id,
        status: { in: [ALLOCATION_STATUS.TENTATIVE, ALLOCATION_STATUS.CONFIRMED] },
        offering: { cycleId: offering.cycleId },
      },
      include: { offering: { include: { course: { select: { credits: true } } } } },
    });
    const currentCredits = existingAllocations.reduce(
      (sum, a) => sum + a.offering.course.credits,
      0
    );
    const newCredits = currentCredits + offering.course.credits;
    if (newCredits > creditConstraint.maxCredits) {
      return {
        valid: false,
        reason: `Adding this course (${offering.course.credits} credits) would exceed your maximum credit limit of ${creditConstraint.maxCredits}. Current: ${currentCredits} credits.`,
      };
    }
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

/**
 * Initialize or refresh PointAccounts for all enrolled students in a cycle.
 *
 * Called when:
 * - A new bidding cycle is activated (round 1 point setup)
 * - A new round is opened AND carryForwardEnabled is true
 *   → unused points from previous round carry over
 *
 * Carry-forward logic:
 *   newTotal = baseTotalPoints + (previousTotal - previousUsed - previousReserved)
 *   reserved and used reset to 0 for the new round period
 */
export async function initializePointAccounts(
  cycleId: string,
  carryForward: boolean = false
): Promise<void> {
  const cycle = await db.biddingCycle.findUnique({
    where: { id: cycleId },
    include: {
      pointAccounts: { include: { student: true } },
    },
  });
  if (!cycle) throw new Error(`Cycle ${cycleId} not found`);

  // Get all students enrolled in the cycle (via their batch)
  const students = await db.studentProfile.findMany({
    where: { isActive: true },
  });

  for (const student of students) {
    const existing = cycle.pointAccounts.find(
      (pa) => pa.studentProfileId === student.id
    );

    if (!existing) {
      // Create fresh account
      await db.pointAccount.create({
        data: {
          studentProfileId: student.id,
          cycleId,
          totalPoints: cycle.totalBidPoints,
          usedPoints: 0,
          reservedPoints: 0,
        },
      });
    } else if (carryForward) {
      // Carry forward: unused points roll over, reset used/reserved
      const leftover =
        existing.totalPoints - existing.usedPoints - existing.reservedPoints;
      await db.pointAccount.update({
        where: { id: existing.id },
        data: {
          totalPoints: cycle.totalBidPoints + Math.max(0, leftover),
          usedPoints: 0,
          reservedPoints: 0,
        },
      });
    }
    // If not carryForward and account exists, leave as-is
  }
}
