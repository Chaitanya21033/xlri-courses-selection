/**
 * Seed Script — BidScholar Demo Data
 *
 * Creates:
 * - 1 Admin
 * - 30 Professors
 * - 600 Students (split BM/HRM)
 * - 30 Course offerings with mixed eligibility
 * - 1 Active bidding cycle with 2 rounds
 * - Realistic bid data with tie scenarios
 * - Demo accounts with password: demo1234
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

let HASH = "";

async function getHash(): Promise<string> {
  if (!HASH) HASH = await bcrypt.hash("demo1234", 10);
  return HASH;
}

// ─── Course Data ───────────────────────────────────────────────────────────────

const COURSES = [
  // BM-only
  { code: "ELE-BM01", title: "Corporate Strategy & Value Creation", credits: 3, eligibility: "BM", seatCap: 60, demand: "high" },
  { code: "ELE-BM02", title: "Private Equity & Venture Capital", credits: 3, eligibility: "BM", seatCap: 40, demand: "high" },
  { code: "ELE-BM03", title: "Mergers, Acquisitions & Corporate Restructuring", credits: 3, eligibility: "BM", seatCap: 45, demand: "medium" },
  { code: "ELE-BM04", title: "Derivatives & Risk Management", credits: 3, eligibility: "BM", seatCap: 50, demand: "medium" },
  { code: "ELE-BM05", title: "Real Estate Investment & Finance", credits: 3, eligibility: "BM", seatCap: 35, demand: "low" },
  // HRM-only
  { code: "ELE-HR01", title: "Strategic Human Capital Planning", credits: 3, eligibility: "HRM", seatCap: 40, demand: "high" },
  { code: "ELE-HR02", title: "Organisational Behaviour & Change", credits: 3, eligibility: "HRM", seatCap: 45, demand: "high" },
  { code: "ELE-HR03", title: "Compensation Design & Rewards Strategy", credits: 3, eligibility: "HRM", seatCap: 35, demand: "medium" },
  { code: "ELE-HR04", title: "Talent Acquisition & Employer Branding", credits: 3, eligibility: "HRM", seatCap: 30, demand: "medium" },
  { code: "ELE-HR05", title: "Labour Law & Industrial Relations", credits: 3, eligibility: "HRM", seatCap: 25, demand: "low" },
  // Both
  { code: "ELE-GN01", title: "Digital Transformation & Technology Strategy", credits: 3, eligibility: "BOTH", seatCap: 80, demand: "high" },
  { code: "ELE-GN02", title: "Business Analytics & Decision Science", credits: 3, eligibility: "BOTH", seatCap: 70, demand: "high" },
  { code: "ELE-GN03", title: "Entrepreneurship & New Venture Creation", credits: 3, eligibility: "BOTH", seatCap: 60, demand: "high" },
  { code: "ELE-GN04", title: "Sustainability & ESG Strategy", credits: 3, eligibility: "BOTH", seatCap: 55, demand: "medium" },
  { code: "ELE-GN05", title: "Design Thinking & Innovation Management", credits: 3, eligibility: "BOTH", seatCap: 50, demand: "medium" },
  { code: "ELE-GN06", title: "Global Business & Cross-cultural Management", credits: 3, eligibility: "BOTH", seatCap: 50, demand: "medium" },
  { code: "ELE-GN07", title: "AI & Machine Learning for Managers", credits: 3, eligibility: "BOTH", seatCap: 65, demand: "high" },
  { code: "ELE-GN08", title: "Negotiation & Conflict Resolution", credits: 3, eligibility: "BOTH", seatCap: 60, demand: "medium" },
  { code: "ELE-GN09", title: "Family Business & Succession Planning", credits: 3, eligibility: "BOTH", seatCap: 30, demand: "low" },
  { code: "ELE-GN10", title: "Social Enterprise & Impact Investing", credits: 3, eligibility: "BOTH", seatCap: 35, demand: "low" },
  { code: "ELE-GN11", title: "Supply Chain Strategy & Resilience", credits: 3, eligibility: "BOTH", seatCap: 50, demand: "medium" },
  { code: "ELE-GN12", title: "Consumer Behaviour & Brand Management", credits: 3, eligibility: "BOTH", seatCap: 55, demand: "medium" },
  { code: "ELE-GN13", title: "Public Policy & Regulation", credits: 3, eligibility: "BOTH", seatCap: 40, demand: "low" },
  { code: "ELE-GN14", title: "FinTech & Digital Payments", credits: 3, eligibility: "BOTH", seatCap: 45, demand: "medium" },
  { code: "ELE-GN15", title: "Healthcare Management & Policy", credits: 3, eligibility: "BOTH", seatCap: 40, demand: "low" },
  { code: "ELE-GN16", title: "Sports & Entertainment Management", credits: 3, eligibility: "BOTH", seatCap: 30, demand: "low" },
  { code: "ELE-GN17", title: "Corporate Governance & Ethics", credits: 3, eligibility: "BOTH", seatCap: 45, demand: "medium" },
  { code: "ELE-GN18", title: "Real Options & Investment Decisions", credits: 3, eligibility: "BOTH", seatCap: 35, demand: "low" },
  { code: "ELE-GN19", title: "Platform Business Models & Network Effects", credits: 3, eligibility: "BOTH", seatCap: 50, demand: "high" },
  { code: "ELE-GN20", title: "Project Finance & Infrastructure", credits: 3, eligibility: "BOTH", seatCap: 40, demand: "medium" },
];

const PROFESSOR_DATA = [
  { name: "Prof. Rajesh Sharma", dept: "Finance", desig: "Professor" },
  { name: "Prof. Priya Nair", dept: "Strategy", desig: "Associate Professor" },
  { name: "Prof. Vikram Gupta", dept: "Finance", desig: "Professor" },
  { name: "Prof. Ananya Krishnan", dept: "Finance", desig: "Assistant Professor" },
  { name: "Prof. Suresh Menon", dept: "Finance", desig: "Professor" },
  { name: "Prof. Divya Rajan", dept: "Human Resources", desig: "Professor" },
  { name: "Prof. Kavita Bhat", dept: "Human Resources", desig: "Associate Professor" },
  { name: "Prof. Ravi Iyer", dept: "Human Resources", desig: "Professor" },
  { name: "Prof. Meera Pillai", dept: "Human Resources", desig: "Assistant Professor" },
  { name: "Prof. Arun Patel", dept: "Human Resources", desig: "Professor" },
  { name: "Prof. Nisha Verma", dept: "Technology", desig: "Professor" },
  { name: "Prof. Alok Sinha", dept: "Analytics", desig: "Associate Professor" },
  { name: "Prof. Smita Joshi", dept: "Entrepreneurship", desig: "Professor" },
  { name: "Prof. Deepak Rao", dept: "Sustainability", desig: "Assistant Professor" },
  { name: "Prof. Harini Basu", dept: "Innovation", desig: "Professor" },
  { name: "Prof. Pranav Malhotra", dept: "International Business", desig: "Associate Professor" },
  { name: "Prof. Kavitha Reddy", dept: "Technology", desig: "Professor" },
  { name: "Prof. Sanjay Mehta", dept: "General Management", desig: "Professor" },
  { name: "Prof. Usha Chandrasekhar", dept: "Entrepreneurship", desig: "Associate Professor" },
  { name: "Prof. Rohan Deshpande", dept: "Sustainability", desig: "Assistant Professor" },
  { name: "Prof. Anjali Kapoor", dept: "Operations", desig: "Professor" },
  { name: "Prof. Manoj Tiwari", dept: "Marketing", desig: "Associate Professor" },
  { name: "Prof. Sunita Agarwal", dept: "Public Policy", desig: "Professor" },
  { name: "Prof. Vinod Choudhary", dept: "Finance", desig: "Assistant Professor" },
  { name: "Prof. Geeta Mishra", dept: "Healthcare", desig: "Professor" },
  { name: "Prof. Arjun Kumar", dept: "Sports Management", desig: "Associate Professor" },
  { name: "Prof. Pooja Saxena", dept: "Governance", desig: "Professor" },
  { name: "Prof. Amit Jain", dept: "Finance", desig: "Assistant Professor" },
  { name: "Prof. Nalini Sriram", dept: "Technology", desig: "Professor" },
  { name: "Prof. Tarun Bhattacharya", dept: "Finance", desig: "Professor" },
];

function emailify(name: string): string {
  return name
    .toLowerCase()
    .replace("prof. ", "prof.")
    .replace(/\s+/g, ".")
    .replace(/[^a-z.]/g, "") + "@xlri.ac.in";
}

function pad(n: number, len = 3): string {
  return String(n).padStart(len, "0");
}

async function main() {
  const HASH = await getHash();
  console.log("🌱 Seeding BidScholar demo data...\n");

  // Clean up existing data (sequential to avoid libsql batch issues)
  await db.confirmationAction.deleteMany();
  await db.allocationResult.deleteMany();
  await db.bidHistory.deleteMany();
  await db.bid.deleteMany();
  await db.waitlistEntry.deleteMany();
  await db.pointAccount.deleteMany();
  await db.tieBreakPolicy.deleteMany();
  await db.courseOffering.deleteMany();
  await db.quotaRule.deleteMany();
  await db.course.deleteMany();
  await db.studentCourseGrade.deleteMany();
  await db.creditConstraint.deleteMany();
  await db.biddingRound.deleteMany();
  await db.biddingCycle.deleteMany();
  await db.academicTerm.deleteMany();
  await db.notification.deleteMany();
  await db.auditLog.deleteMany();
  await db.studentProfile.deleteMany();
  await db.professorProfile.deleteMany();
  await db.batch.deleteMany();
  await db.user.deleteMany();
  await db.importJob.deleteMany();
  await db.systemSetting.deleteMany();

  console.log("✓ Cleared existing data");

  // ── Admin ──────────────────────────────────────────────────────────────────
  const adminUser = await db.user.create({
    data: {
      email: "admin@xlri.ac.in",
      name: "Platform Administrator",
      passwordHash: HASH,
      role: "ADMIN",
    },
  });
  console.log("✓ Admin created:", adminUser.email);

  // ── Batches ────────────────────────────────────────────────────────────────
  const [bmBatch, hrmBatch] = await Promise.all([
    db.batch.create({
      data: { name: "BM 2024-26", programme: "BM", academicYear: "2024-26" },
    }),
    db.batch.create({
      data: { name: "HRM 2024-26", programme: "HRM", academicYear: "2024-26" },
    }),
  ]);
  console.log("✓ Batches created");

  // ── Academic Term ──────────────────────────────────────────────────────────
  const term = await db.academicTerm.create({
    data: {
      name: "Term 3 · 2025-26",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-04-30"),
      isActive: true,
    },
  });

  // ── Bidding Cycle ──────────────────────────────────────────────────────────
  const cycle = await db.biddingCycle.create({
    data: {
      termId: term.id,
      name: "Elective Bidding · Term 3",
      totalBidPoints: 1000,
      carryForwardEnabled: false,
      minBidRequired: true,
      crossProgEnabled: true,
      isActive: true,
    },
  });

  // ── Bidding Rounds ─────────────────────────────────────────────────────────
  const round1 = await db.biddingRound.create({
    data: {
      cycleId: cycle.id,
      roundNumber: 1,
      name: "Round 1 — Primary Bidding",
      status: "OPEN",
      opensAt: new Date("2026-01-20T09:00:00Z"),
      closesAt: new Date("2026-01-25T23:59:00Z"),
      isConfirmationRound: false,
      quotaRelaxed: false,
    },
  });

  await db.biddingRound.create({
    data: {
      cycleId: cycle.id,
      roundNumber: 2,
      name: "Round 2 — Confirmation",
      status: "DRAFT",
      opensAt: new Date("2026-01-28T09:00:00Z"),
      closesAt: new Date("2026-01-30T23:59:00Z"),
      isConfirmationRound: true,
      quotaRelaxed: true,
    },
  });

  console.log("✓ Academic term, cycle, and rounds created");

  // ── Professors ─────────────────────────────────────────────────────────────
  const professors: Array<{ userId: string; profileId: string }> = [];

  for (let i = 0; i < PROFESSOR_DATA.length; i++) {
    const p = PROFESSOR_DATA[i];
    const user = await db.user.create({
      data: {
        email: i === 0 ? "prof.sharma@xlri.ac.in" : emailify(p.name),
        name: p.name,
        passwordHash: HASH,
        role: "PROFESSOR",
      },
    });

    const profile = await db.professorProfile.create({
      data: {
        userId: user.id,
        employeeId: `EMP${pad(i + 1)}`,
        department: p.dept,
        designation: p.desig,
        bio: `${p.desig} in the ${p.dept} area with expertise in management education.`,
      },
    });

    professors.push({ userId: user.id, profileId: profile.id });
  }

  console.log(`✓ ${professors.length} professors created`);

  // ── Courses & Offerings ────────────────────────────────────────────────────
  const TIE_BREAK_METHODS = ["CQPI_DESC", "GRADE_DESC", "LOTTERY", "CQPI_DESC", "LOTTERY"];

  for (let i = 0; i < COURSES.length; i++) {
    const c = COURSES[i];
    const prof = professors[i % professors.length];

    const course = await db.course.create({
      data: {
        code: c.code,
        title: c.title,
        credits: c.credits,
        description: `An intensive elective covering advanced concepts in ${c.title.toLowerCase()}. Students will engage with case studies, frameworks, and practical applications relevant to the contemporary business environment.`,
        prerequisites: i % 4 === 0 ? "Financial Accounting, Quantitative Methods" : null,
        learningGoals: `By the end of this course, students will be able to apply frameworks from ${c.title} to real business contexts, develop analytical rigour, and communicate findings effectively to stakeholders.`,
        scheduleNotes: `Tuesdays & Thursdays, 9:00–10:30 AM · Room ${100 + (i % 20)}`,
      },
    });

    const offering = await db.courseOffering.create({
      data: {
        courseId: course.id,
        cycleId: cycle.id,
        professorId: prof.profileId,
        eligibility: c.eligibility,
        seatCap: c.seatCap,
        status: "BIDDING_OPEN",
        mrb: 0,
        additionalNotes: "Students are expected to read all assigned cases before class.",
      },
    });

    // Tie-break policy for every course
    const method = TIE_BREAK_METHODS[i % TIE_BREAK_METHODS.length];
    await db.tieBreakPolicy.create({
      data: {
        offeringId: offering.id,
        method,
        prerequisiteCourseCode: method === "GRADE_DESC" ? "FIN101" : null,
        isLocked: false,
      },
    });
  }

  console.log(`✓ ${COURSES.length} courses and offerings created`);

  // ── Students (600 total: 360 BM, 240 HRM) ─────────────────────────────────
  const BM_COUNT = 360;
  const HRM_COUNT = 240;
  const studentIds: string[] = [];

  // BM students
  for (let i = 1; i <= BM_COUNT; i++) {
    const rollNumber = `BM24${pad(i, 3)}`;
    const email = i === 1 ? "bm001@xlri.ac.in" : `${rollNumber.toLowerCase()}@xlri.ac.in`;
    const user = await db.user.create({
      data: {
        email,
        name: `BM Student ${pad(i, 3)}`,
        passwordHash: HASH,
        role: "STUDENT",
      },
    });

    await db.studentProfile.create({
      data: {
        userId: user.id,
        rollNumber,
        programme: "BM",
        batchId: bmBatch.id,
        cqpi: Math.round((6.0 + Math.random() * 4.0) * 100) / 100, // 6.0–10.0
        enrolledYear: 2024,
      },
    });

    studentIds.push(user.id);
  }

  // HRM students
  for (let i = 1; i <= HRM_COUNT; i++) {
    const rollNumber = `HR24${pad(i, 3)}`;
    const email = i === 1 ? "hrm001@xlri.ac.in" : `${rollNumber.toLowerCase()}@xlri.ac.in`;
    const user = await db.user.create({
      data: {
        email,
        name: `HRM Student ${pad(i, 3)}`,
        passwordHash: HASH,
        role: "STUDENT",
      },
    });

    await db.studentProfile.create({
      data: {
        userId: user.id,
        rollNumber,
        programme: "HRM",
        batchId: hrmBatch.id,
        cqpi: Math.round((6.0 + Math.random() * 4.0) * 100) / 100,
        enrolledYear: 2024,
      },
    });

    studentIds.push(user.id);
  }

  console.log(`✓ ${BM_COUNT + HRM_COUNT} students created`);

  // ── Point Accounts ─────────────────────────────────────────────────────────
  const allStudentProfiles = await db.studentProfile.findMany({
    select: { id: true, programme: true },
  });

  for (const sp of allStudentProfiles) {
    await db.pointAccount.create({
      data: {
        studentProfileId: sp.id,
        cycleId: cycle.id,
        totalPoints: 1000,
        usedPoints: 0,
        reservedPoints: 0,
      },
    });
  }

  console.log("✓ Point accounts created for all students");

  // ── Sample Bids (simulate realistic demand) ────────────────────────────────
  const offerings = await db.courseOffering.findMany({
    include: { course: true },
  });

  let totalBids = 0;

  for (const sp of allStudentProfiles.slice(0, 200)) {
    // Give first 200 students some bids
    const eligibleOfferings = offerings.filter(
      (o) => o.eligibility === sp.programme || o.eligibility === "BOTH"
    );

    // Pick 3-5 random courses to bid on
    const count = 3 + Math.floor(Math.random() * 3);
    const picked = eligibleOfferings
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    // Find student user
    const userRecord = await db.user.findFirst({
      where: { studentProfile: { id: sp.id } },
      select: { id: true },
    });
    if (!userRecord) continue;

    let remainingPoints = 1000;

    for (let j = 0; j < picked.length; j++) {
      const offering = picked[j];
      const isLast = j === picked.length - 1;
      const pts = isLast
        ? Math.min(remainingPoints, 50 + Math.floor(Math.random() * 200))
        : Math.min(remainingPoints - (picked.length - j - 1) * 50, 50 + Math.floor(Math.random() * 250));

      if (pts <= 0) continue;

      await db.bid.create({
        data: {
          userId: userRecord.id,
          offeringId: offering.id,
          roundId: round1.id,
          points: pts,
          status: "ACTIVE",
        },
      });

      await db.pointAccount.update({
        where: {
          studentProfileId_cycleId: {
            studentProfileId: sp.id,
            cycleId: cycle.id,
          },
        },
        data: { reservedPoints: { increment: pts } },
      });

      remainingPoints -= pts;
      totalBids++;
    }
  }

  console.log(`✓ ${totalBids} sample bids created`);

  // ── Update MRB values for offerings ────────────────────────────────────────
  for (const offering of offerings) {
    const bids = await db.bid.findMany({
      where: { offeringId: offering.id, roundId: round1.id },
      orderBy: { points: "desc" },
    });

    if (bids.length === 0) continue;

    const seatCap = offering.seatCap;
    const mrb =
      bids.length <= seatCap ? 0 : bids[Math.min(seatCap - 1, bids.length - 1)].points;

    await db.courseOffering.update({
      where: { id: offering.id },
      data: { mrb },
    });
  }

  console.log("✓ MRB values updated");

  // ── System settings ────────────────────────────────────────────────────────
  await db.systemSetting.createMany({
    data: [
      { key: "PLATFORM_NAME", value: "BidScholar" },
      { key: "INSTITUTION_NAME", value: "XLRI Jamshedpur" },
      { key: "SUPPORT_EMAIL", value: "support@bidscholar.io" },
      { key: "MAINTENANCE_MODE", value: "false" },
    ],
  });

  // ── Audit log entry ────────────────────────────────────────────────────────
  await db.auditLog.create({
    data: {
      userId: adminUser.id,
      action: "IMPORT_COMPLETED",
      entityType: "System",
      entityId: "seed",
      after: JSON.stringify({ message: "Demo data seeded successfully" }),
    },
  });

  console.log("\n✅ Seed complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Demo Credentials (password: demo1234)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Admin    : admin@xlri.ac.in");
  console.log("Professor: prof.sharma@xlri.ac.in");
  console.log("BM Student : bm001@xlri.ac.in");
  console.log("HRM Student: hrm001@xlri.ac.in");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
