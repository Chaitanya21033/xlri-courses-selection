import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Whitelist of allowed setting keys to prevent configuration injection
const ALLOWED_SETTING_KEYS = [
  "system_notice",
  "maintenance_mode",
  "max_bid_points",
  "min_bid_points",
  "max_courses_per_student",
  "min_credits",
  "max_credits",
  "default_seat_cap",
  "carry_forward_enabled",
  "cross_programme_enabled",
] as const;

const UpsertSchema = z.object({
  key: z.enum(ALLOWED_SETTING_KEYS),
  value: z.string(),
});

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await db.systemSetting.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof UpsertSchema>;
  try {
    body = UpsertSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const setting = await db.systemSetting.upsert({
    where: { key: body.key },
    create: { key: body.key, value: body.value },
    update: { value: body.value },
  });

  return NextResponse.json(setting);
}
