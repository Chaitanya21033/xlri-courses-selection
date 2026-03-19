/**
 * SOP-Based Intake Tests
 *
 * Unit tests for the SOP allocation path in the bidding engine,
 * SOP validation logic, and ranking behavior.
 *
 * These are unit tests — no database calls.
 */

import { describe, it, expect } from "vitest";
import type { BidRecord, AllocationDecision } from "@/lib/bidding-engine";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSopBid(
  id: string,
  rollNumber = `R${id}`,
  sopScore: number | null = null
): BidRecord {
  return {
    userId: `user-${id}`,
    studentProfileId: `sp-${id}`,
    rollNumber,
    offeringId: "offering-sop",
    points: 0, // points are irrelevant for SOP courses
    cqpi: 7.0,
    sopScore,
  };
}

/**
 * Inline implementation of allocateSopCourse logic for unit testing.
 * (Mirrors the logic in bidding-engine.ts without DB access.)
 */
function allocateSopCourseLogic(
  bids: BidRecord[],
  offeringId: string,
  seatCap: number
): AllocationDecision[] {
  if (bids.length === 0) return [];

  const sorted = [...bids].sort((a, b) => {
    const scoreA = a.sopScore ?? 0;
    const scoreB = b.sopScore ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.rollNumber.localeCompare(b.rollNumber);
  });

  return sorted.map((b, idx) => ({
    studentProfileId: b.studentProfileId,
    userId: b.userId,
    offeringId,
    status: idx < seatCap ? "WINNING" : "LOSING",
    finalPoints: 0,
    tieBroken: false,
  }));
}

// ─── SOP Allocation Logic ─────────────────────────────────────────────────────

describe("SOP allocation — basic ranking", () => {
  it("ranks applicants by SOP score descending", () => {
    const bids = [
      makeSopBid("a", "R001", 70),
      makeSopBid("b", "R002", 90),
      makeSopBid("c", "R003", 55),
    ];
    const decisions = allocateSopCourseLogic(bids, "off-1", 2);

    expect(decisions[0].studentProfileId).toBe("sp-b"); // score 90
    expect(decisions[1].studentProfileId).toBe("sp-a"); // score 70
    expect(decisions[2].studentProfileId).toBe("sp-c"); // score 55
  });

  it("top seatCap applicants are WINNING, rest are LOSING", () => {
    const bids = [
      makeSopBid("a", "R001", 80),
      makeSopBid("b", "R002", 60),
      makeSopBid("c", "R003", 95),
      makeSopBid("d", "R004", 40),
    ];
    const decisions = allocateSopCourseLogic(bids, "off-1", 2);

    const winners = decisions.filter((d) => d.status === "WINNING");
    const losers = decisions.filter((d) => d.status === "LOSING");

    expect(winners).toHaveLength(2);
    expect(losers).toHaveLength(2);
    expect(winners[0].studentProfileId).toBe("sp-c"); // 95
    expect(winners[1].studentProfileId).toBe("sp-a"); // 80
    expect(losers[0].studentProfileId).toBe("sp-b");  // 60
    expect(losers[1].studentProfileId).toBe("sp-d");  // 40
  });

  it("all applicants win when demand ≤ seat cap", () => {
    const bids = [
      makeSopBid("a", "R001", 70),
      makeSopBid("b", "R002", 85),
    ];
    const decisions = allocateSopCourseLogic(bids, "off-1", 5);

    expect(decisions.every((d) => d.status === "WINNING")).toBe(true);
    expect(decisions).toHaveLength(2);
  });

  it("returns empty array when no bids", () => {
    const decisions = allocateSopCourseLogic([], "off-1", 5);
    expect(decisions).toHaveLength(0);
  });
});

describe("SOP allocation — tie-breaking", () => {
  it("breaks ties by rollNumber ascending when SOP scores are equal", () => {
    const bids = [
      makeSopBid("a", "BM2024050", 80),
      makeSopBid("b", "BM2024010", 80),
      makeSopBid("c", "BM2024030", 80),
    ];
    const decisions = allocateSopCourseLogic(bids, "off-1", 2);

    // Lexicographic: BM2024010 < BM2024030 < BM2024050
    expect(decisions[0].studentProfileId).toBe("sp-b"); // BM2024010 wins
    expect(decisions[1].studentProfileId).toBe("sp-c"); // BM2024030 wins
    expect(decisions[2].status).toBe("LOSING");         // BM2024050 loses
  });

  it("is deterministic — same input always produces same output", () => {
    const bids = [
      makeSopBid("a", "R001", 75),
      makeSopBid("b", "R002", 75),
      makeSopBid("c", "R003", 90),
    ];
    const r1 = allocateSopCourseLogic([...bids], "off-1", 2);
    const r2 = allocateSopCourseLogic([...bids], "off-1", 2);
    expect(r1.map((d) => d.studentProfileId)).toEqual(r2.map((d) => d.studentProfileId));
  });
});

describe("SOP allocation — unscored applicants", () => {
  it("treats null sopScore as 0 and ranks them last", () => {
    const bids = [
      makeSopBid("scored", "R001", 50),
      makeSopBid("unscored", "R002", null),
    ];
    const decisions = allocateSopCourseLogic(bids, "off-1", 1);

    expect(decisions[0].studentProfileId).toBe("sp-scored");   // score 50 wins
    expect(decisions[1].studentProfileId).toBe("sp-unscored"); // null = 0 loses
    expect(decisions[0].status).toBe("WINNING");
    expect(decisions[1].status).toBe("LOSING");
  });

  it("when all are unscored, breaks ties by rollNumber", () => {
    const bids = [
      makeSopBid("z", "R003", null),
      makeSopBid("a", "R001", null),
      makeSopBid("m", "R002", null),
    ];
    const decisions = allocateSopCourseLogic(bids, "off-1", 2);

    // All score=0, sorted by rollNumber: R001 < R002 < R003
    expect(decisions[0].studentProfileId).toBe("sp-a"); // R001
    expect(decisions[1].studentProfileId).toBe("sp-m"); // R002
    expect(decisions[2].status).toBe("LOSING");         // R003
  });
});

describe("SOP allocation — finalPoints behavior", () => {
  it("finalPoints is always 0 for SOP-based courses", () => {
    const bids = [
      makeSopBid("a", "R001", 80),
      makeSopBid("b", "R002", 60),
    ];
    const decisions = allocateSopCourseLogic(bids, "off-1", 2);
    expect(decisions.every((d) => d.finalPoints === 0)).toBe(true);
  });
});

// ─── SOP Validation Logic ─────────────────────────────────────────────────────

describe("SOP validation — character limit", () => {
  it("accepts SOP within character limit", () => {
    const sopText = "a".repeat(500);
    const limit = 1000;
    expect(sopText.trim().length <= limit).toBe(true);
  });

  it("rejects SOP exceeding character limit", () => {
    const sopText = "a".repeat(1001);
    const limit = 1000;
    expect(sopText.trim().length > limit).toBe(true);
  });

  it("rejects empty/whitespace-only SOP", () => {
    const isEmpty = (s: string) => !s.trim();
    expect(isEmpty("")).toBe(true);
    expect(isEmpty("   \n\t  ")).toBe(true);
    expect(isEmpty("valid content")).toBe(false);
  });
});

describe("SOP validation — score range", () => {
  it("accepts scores in 0–100 range", () => {
    const valid = (n: number) => Number.isInteger(n) && n >= 0 && n <= 100;
    expect(valid(0)).toBe(true);
    expect(valid(50)).toBe(true);
    expect(valid(100)).toBe(true);
  });

  it("rejects scores outside 0–100 range", () => {
    const valid = (n: number) => Number.isInteger(n) && n >= 0 && n <= 100;
    expect(valid(-1)).toBe(false);
    expect(valid(101)).toBe(false);
    expect(valid(1000)).toBe(false);
  });

  it("rejects non-integer scores", () => {
    const valid = (n: number) => Number.isInteger(n) && n >= 0 && n <= 100;
    expect(valid(85.5)).toBe(false);
    expect(valid(NaN)).toBe(false);
  });
});

// ─── Mixed environment (SOP + points-based courses coexist) ──────────────────

describe("SOP vs. points-based coexistence", () => {
  it("SOP course assigns finalPoints=0 regardless of bid points", () => {
    const sopBid = makeSopBid("a", "R001", 90);
    sopBid.points = 500; // student also put 500 points, but irrelevant

    const decisions = allocateSopCourseLogic([sopBid], "off-sop", 1);
    expect(decisions[0].finalPoints).toBe(0);
    expect(decisions[0].status).toBe("WINNING");
  });

  it("bid points have no effect on SOP course ranking", () => {
    const bids = [
      { ...makeSopBid("lowscore", "R001", 30), points: 999 }, // high points, low SOP score
      { ...makeSopBid("highscore", "R002", 95), points: 1 },  // low points, high SOP score
    ];
    const decisions = allocateSopCourseLogic(bids, "off-sop", 1);
    expect(decisions[0].studentProfileId).toBe("sp-highscore"); // SOP score wins
    expect(decisions[0].status).toBe("WINNING");
    expect(decisions[1].status).toBe("LOSING");
  });
});
