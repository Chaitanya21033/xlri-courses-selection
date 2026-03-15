import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ── helpers ──────────────────────────────────────────────────────────────────

function generatePassword(): string {
  // 10-char alphanumeric, readable (no 0/O/l/1 confusion)
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
    // Handle quoted fields
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

// ── POST /api/admin/import/professors ────────────────────────────────────────

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

  // Validate required columns
  const required = ["name", "email"];
  const missing = required.filter((k) => !Object.keys(rows[0]).includes(k));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required columns: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const HASH_SALT = 10;
  const results: {
    name: string; email: string; role: string;
    password: string; employeeId: string; status: string; error?: string;
  }[] = [];

  for (const row of rows) {
    const name = row.name?.trim();
    const email = row.email?.trim().toLowerCase();
    const department = row.department?.trim() || "General";
    const designation = row.designation?.trim() || "";
    const employeeId = row.employee_id?.trim() || row.employeeid?.trim() ||
      `EMP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    if (!name || !email) {
      results.push({ name: name || "?", email: email || "?", role: "PROFESSOR", password: "", employeeId, status: "skipped", error: "Missing name or email" });
      continue;
    }

    const plainPassword = generatePassword();

    try {
      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        results.push({ name, email, role: "PROFESSOR", password: "", employeeId, status: "skipped", error: "Email already exists" });
        continue;
      }

      const existingEmp = await db.professorProfile.findUnique({ where: { employeeId } });
      const finalEmpId = existingEmp
        ? `${employeeId}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`
        : employeeId;

      const passwordHash = await bcrypt.hash(plainPassword, HASH_SALT);
      await db.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: "PROFESSOR",
          isActive: true,
          professorProfile: {
            create: {
              employeeId: finalEmpId,
              department,
              designation: designation || null,
            },
          },
        },
      });

      results.push({ name, email, role: "PROFESSOR", password: plainPassword, employeeId: finalEmpId, status: "created" });
    } catch (err: any) {
      results.push({ name, email, role: "PROFESSOR", password: "", employeeId, status: "error", error: err.message });
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  await db.importJob.create({
    data: {
      type: "PROFESSORS",
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

  return NextResponse.json({ created, skipped, errors, results }, { status: 200 });
}
