import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { broadcastNotification } from "@/lib/audit";
import { z } from "zod";

const BroadcastSchema = z.object({
  audience: z.enum(["ALL", "STUDENTS", "PROFESSORS", "ADMINS"]),
  type: z.enum(["ANNOUNCEMENT", "ROUND_OPENED", "ROUND_CLOSED", "ALLOCATION_RESULT", "CONFIRMATION_REQUIRED", "COURSE_CANCELLED", "SYSTEM"]),
  title: z.string().min(2).max(200),
  message: z.string().min(2).max(2000),
  link: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sentById = (session.user as any)?.id;

  let body: z.infer<typeof BroadcastSchema>;
  try {
    body = BroadcastSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid request", details: e.errors }, { status: 400 });
  }

  const roleMap: Record<string, string | undefined> = {
    ALL: undefined,
    STUDENTS: "STUDENT",
    PROFESSORS: "PROFESSOR",
    ADMINS: "ADMIN",
  };

  const roleFilter = roleMap[body.audience];
  const users = await db.user.findMany({
    where: { isActive: true, ...(roleFilter ? { role: roleFilter } : {}) },
    select: { id: true },
  });

  await broadcastNotification({
    userIds: users.map((u) => u.id),
    sentById,
    type: body.type,
    title: body.title,
    message: body.message,
    link: body.link,
  });

  return NextResponse.json({ success: true, sent: users.length });
}
