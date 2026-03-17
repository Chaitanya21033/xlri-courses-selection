import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const courses = await db.course.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      title: true,
      credits: true,
      createdByProfessorId: true,
    },
    orderBy: { code: "asc" },
  });
  return NextResponse.json(courses);
}
