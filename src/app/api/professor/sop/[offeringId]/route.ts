/**
 * Professor SOP Evaluation API
 *
 * GET  /api/professor/sop/[offeringId]  — list all applicants with SOP for the offering
 * POST /api/professor/sop/[offeringId]  — save SOP scores for one or more applicants
 *
 * Access control: professor must own the offering.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION } from "@/lib/constants";
import { z } from "zod";

const SOP_SELECTION_STATUSES = ["SELECTED", "MAYBE", "NOT_SELECTED"] as const;
type SopSelectionStatus = (typeof SOP_SELECTION_STATUSES)[number];

const ScoreEntrySchema = z.object({
  bidId: z.string(),
  sopScore: z.number().int().min(0).max(100).optional(),
  sopSelectionStatus: z.enum(SOP_SELECTION_STATUSES).optional(),
});

const SubmitScoresSchema = z.object({
  scores: z.array(ScoreEntrySchema).min(1),
});

/** Resolve professor from session, verifying they own the offering. */
async function resolveOwnership(userId: string, offeringId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { professorProfile: true },
  });
  if (!user?.professorProfile) return null;

  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: { course: true },
  });
  if (!offering) return null;
  if (offering.professorId !== user.professorProfile.id) return null;

  return { offering, professorUserId: userId };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ offeringId: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "PROFESSOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any)?.id as string;
  const { offeringId } = await params;

  const ownership = await resolveOwnership(userId, offeringId);
  if (!ownership) {
    return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
  }

  const { offering } = ownership;

  if (!offering.requiresSop) {
    return NextResponse.json(
      { error: "This course does not use SOP-based intake." },
      { status: 422 }
    );
  }

  // Fetch all bids (ACTIVE, WINNING, LOSING) for this offering, enriched with student info
  const bids = await db.bid.findMany({
    where: {
      offeringId,
      status: { in: ["ACTIVE", "WINNING", "LOSING"] },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          studentProfile: {
            select: {
              rollNumber: true,
              programme: true,
              cqpi: true,
            },
          },
        },
      },
    },
    orderBy: [
      // Sort: scored first (by score desc), then unscored
      { sopScore: "desc" },
      { placedAt: "asc" },
    ],
  });

  return NextResponse.json({
    offeringId,
    courseCode: offering.course.code,
    courseTitle: offering.course.title,
    sopWordLimit: offering.sopWordLimit,
    applicants: bids.map((b) => ({
      bidId: b.id,
      userId: b.userId,
      studentName: b.user.name,
      rollNumber: b.user.studentProfile?.rollNumber ?? null,
      programme: b.user.studentProfile?.programme ?? null,
      cqpi: b.user.studentProfile?.cqpi ?? null,
      bidStatus: b.status,
      sopText: b.sopText,
      sopSubmittedAt: b.sopSubmittedAt,
      sopScore: b.sopScore,
      sopScoredAt: b.sopScoredAt,
      sopSelectionStatus: b.sopSelectionStatus,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ offeringId: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "PROFESSOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any)?.id as string;
  const { offeringId } = await params;

  const ownership = await resolveOwnership(userId, offeringId);
  if (!ownership) {
    return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
  }

  const { offering } = ownership;

  if (!offering.requiresSop) {
    return NextResponse.json(
      { error: "This course does not use SOP-based intake." },
      { status: 422 }
    );
  }

  let body: z.infer<typeof SubmitScoresSchema>;
  try {
    body = SubmitScoresSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json(
      { error: "Invalid request body", details: e.errors },
      { status: 400 }
    );
  }

  const now = new Date();
  const updated: string[] = [];

  for (const entry of body.scores) {
    // Verify each bid belongs to this offering before updating
    const bid = await db.bid.findUnique({
      where: { id: entry.bidId },
      select: { id: true, offeringId: true },
    });

    if (!bid || bid.offeringId !== offeringId) {
      return NextResponse.json(
        { error: `Bid ${entry.bidId} not found or does not belong to this offering.` },
        { status: 422 }
      );
    }

    const updateData: Record<string, unknown> = {
      sopScoredAt: now,
      sopScoredById: userId,
    };
    if (entry.sopScore !== undefined) updateData.sopScore = entry.sopScore;
    if (entry.sopSelectionStatus !== undefined) updateData.sopSelectionStatus = entry.sopSelectionStatus;

    await db.bid.update({
      where: { id: entry.bidId },
      data: updateData,
    });

    updated.push(entry.bidId);
  }

  await createAuditLog({
    userId,
    action: AUDIT_ACTION.SOP_SCORED,
    entityType: "CourseOffering",
    entityId: offeringId,
    after: { scoredBidIds: updated, scoredAt: now },
    metadata: { courseTitle: offering.course.title, totalScored: updated.length },
  });

  return NextResponse.json({ success: true, updatedBids: updated.length });
}
