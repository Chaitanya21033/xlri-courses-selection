import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTION } from "@/lib/constants";
import bcrypt from "bcryptjs";
import crypto from "crypto";

function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  return Array.from(crypto.randomBytes(length))
    .map((b) => chars[b % chars.length])
    .join("");
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

  const newPassword = generatePassword(14);
  const hash = await bcrypt.hash(newPassword, 12);

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

  // Return the temporary password so admin can share it securely out-of-band.
  // Response includes no-cache headers to prevent password leakage via caches.
  const response = NextResponse.json({
    success: true,
    newPassword,
    warning: "Communicate this password securely to the user. It will not be stored or shown again.",
  });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  response.headers.set("Pragma", "no-cache");
  return response;
}
