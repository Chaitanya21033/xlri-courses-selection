import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

const Schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

/**
 * POST /api/user/change-password
 * Authenticated user changes their own password.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any)?.id;

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid request", details: e.errors }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 422 });
  }

  const hash = await bcrypt.hash(body.newPassword, 10);
  await db.user.update({ where: { id: userId }, data: { passwordHash: hash } });

  return NextResponse.json({ success: true });
}
