import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION } from "@/lib/constants";
import bcrypt from "bcryptjs";

function generatePassword(length = 10): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

/**
 * POST /api/admin/users/[id]/reset-password
 * Admin resets a user's password and receives the new plain-text password.
 * The admin must communicate this to the user out-of-band.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = (session.user as any)?.id;
  const { id: userId } = await params;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const newPassword = generatePassword(12);
  const hash = await bcrypt.hash(newPassword, 10);

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: hash },
  });

  await createAuditLog({
    userId: adminId,
    action: AUDIT_ACTION.USER_CREATED, // reuse for password reset
    entityType: "User",
    entityId: userId,
    after: { action: "PASSWORD_RESET", targetEmail: user.email },
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ success: true, newPassword });
}
