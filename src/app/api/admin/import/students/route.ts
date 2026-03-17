import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.randomBytes(10))
    .map((b) => chars[b % chars.length])
    .join("");
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    values.push(current.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

// ── POST /api/admin/import/students ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV is empty or has no data rows" }, { status: 400 });
  }

  const required = ["name", "email", "roll_number", "programme"];
  const missing = required.filter((k) => !Object.keys(rows[0]).includes(k));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required columns: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  // Pre-fetch or create batches
  const batchCache = new Map<string, string>(); // "BM|2024-26" → batchId

  async function getOrCreateBatch(programme: string, academicYear: string): Promise<string> {
    const key = `${programme}|${academicYear}`;
    if (batchCache.has(key)) return batchCache.get(key)!;
    const name = `${programme} ${academicYear}`;
    let batch = await db.batch.findFirst({ where: { programme, academicYear } });
    if (!batch) {
      batch = await db.batch.create({ data: { name, programme, academicYear } });
    }
    batchCache.set(key, batch.id);
    return batch.id;
  }

  const HASH_SALT = 12;
  const results: {
    name: string; email: string; role: string;
    password: string; rollNumber: string; programme: string; status: string; error?: string;
  }[] = [];

  for (const row of rows) {
    const name = row.name?.trim();
    const email = row.email?.trim().toLowerCase();
    const rollNumber = row.roll_number?.trim() || row.rollnumber?.trim() || row.roll?.trim() || "";
    const programme = (row.programme?.trim() || "BM").toUpperCase();
    const academicYear = row.academic_year?.trim() || row.academicyear?.trim() || "2024-26";
    const cqpiRaw = row.cqpi?.trim();
    const cqpi = cqpiRaw ? parseFloat(cqpiRaw) : 0.0;
    const enrolledYear = parseInt(row.enrolled_year?.trim() || academicYear.split("-")[0] || "2024");

    if (!name || !email || !rollNumber) {
      results.push({ name: name || "?", email: email || "?", role: "STUDENT", password: "", rollNumber: rollNumber || "?", programme, status: "skipped", error: "Missing name, email or roll_number" });
      continue;
    }

    if (!["BM", "HRM"].includes(programme)) {
      results.push({ name, email, role: "STUDENT", password: "", rollNumber, programme, status: "skipped", error: `Invalid programme "${programme}" (must be BM or HRM)` });
      continue;
    }

    const plainPassword = generatePassword();

    try {
      const existingUser = await db.user.findUnique({ where: { email } });
      if (existingUser) {
        results.push({ name, email, role: "STUDENT", password: "", rollNumber, programme, status: "skipped", error: "Email already exists" });
        continue;
      }

      const existingRoll = await db.studentProfile.findUnique({ where: { rollNumber } });
      if (existingRoll) {
        results.push({ name, email, role: "STUDENT", password: "", rollNumber, programme, status: "skipped", error: "Roll number already exists" });
        continue;
      }

      const batchId = await getOrCreateBatch(programme, academicYear);
      const passwordHash = await bcrypt.hash(plainPassword, HASH_SALT);

      await db.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: "STUDENT",
          isActive: true,
          studentProfile: {
            create: {
              rollNumber,
              programme,
              batchId,
              cqpi: isNaN(cqpi) ? 0.0 : cqpi,
              enrolledYear,
            },
          },
        },
      });

      // Enroll in active bidding cycle if one exists
      const activeCycle = await db.biddingCycle.findFirst({ where: { isActive: true } });
      if (activeCycle) {
        const studentProfile = await db.studentProfile.findUnique({ where: { rollNumber } });
        if (studentProfile) {
          await db.pointAccount.upsert({
            where: { studentProfileId_cycleId: { studentProfileId: studentProfile.id, cycleId: activeCycle.id } },
            create: { studentProfileId: studentProfile.id, cycleId: activeCycle.id, totalPoints: activeCycle.totalBidPoints },
            update: {},
          });
        }
      }

      results.push({ name, email, role: "STUDENT", password: plainPassword, rollNumber, programme, status: "created" });
    } catch (err: any) {
      results.push({ name, email, role: "STUDENT", password: "", rollNumber, programme, status: "error", error: err.message });
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  // Record ImportJob for audit trail
  await db.importJob.create({
    data: {
      type: "STUDENTS",
      status: "COMPLETED",
      fileName: file.name,
      totalRows: rows.length,
      processedRows: created,
      errorRows: errors + skipped,
      errorsJson: JSON.stringify(
        results
          .filter((r) => r.status !== "created")
          .map((r) => ({ email: r.email, reason: r.error }))
      ),
      completedAt: new Date(),
    },
  });

  // Strip plaintext passwords from the response — admin must use the downloadable CSV
  const sanitizedResults = results.map(({ password, ...rest }) => ({
    ...rest,
    passwordGenerated: rest.status === "created",
  }));

  const response = NextResponse.json({ created, skipped, errors, results: sanitizedResults }, { status: 200 });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  response.headers.set("Pragma", "no-cache");
  return response;
}
