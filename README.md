# BidScholar — Elective Course Bidding Platform

A production-quality web platform for points-based elective course bidding in B-schools and graduate management programmes.

---

## Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Demo Credentials](#demo-credentials)
- [Architecture](#architecture)
- [How to Run a Mock Bidding Cycle](#how-to-run-a-mock-bidding-cycle)
- [Platform Guide by Role](#platform-guide-by-role)
- [Business Rules Reference](#business-rules-reference)
- [API Reference](#api-reference)
- [Deployment](#deployment)

---

## Overview

BidScholar lets students allocate a fixed pool of bid points across elective courses. The bidding engine computes the MRB (Minimum Required Bid / clearing price) in real time, resolves oversubscription using pre-declared tie-break policies, reimburses losing bids, and produces an auditable allocation result.

**Roles:**
- **Admin** — creates cycles, configures rounds, manages courses, runs allocation, broadcasts notifications
- **Professor** — edits course details, declares tie-break policy, views demand and allocation
- **Student** — browses eligible courses, places and adjusts bids, withdraws, views results

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### 1. Clone and install

```bash
git clone <repo-url>
cd xlri-courses-selection
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="replace-with-a-random-string-at-least-32-chars"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a secret:
```bash
openssl rand -base64 32
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

The seed script creates:
- 1 admin user
- 30 professors
- 600 students (360 BM, 240 HRM)
- 30 course offerings with mixed eligibility
- 1 active bidding cycle with 2 rounds (Round 1 OPEN, Round 2 DRAFT)
- Sample bids for ~200 students

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@xlri.ac.in` | `demo1234` |
| Professor | `prof.sharma@xlri.ac.in` | `demo1234` |
| BM Student | `bm001@xlri.ac.in` | `demo1234` |
| HRM Student | `hrm001@xlri.ac.in` | `demo1234` |

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                Landing page
│   ├── solutions/              Product features
│   ├── faq/                    FAQ
│   ├── about/                  About the platform
│   ├── blog/                   Blog / insights
│   ├── case-studies/           Case study examples
│   ├── request-demo/           Demo request form
│   ├── auth/                   Login, error pages
│   ├── api/
│   │   ├── admin/              cycles, courses, rounds, allocate, notifications, terms
│   │   ├── professor/          courses/[id] GET/PATCH, tiebreak
│   │   └── student/            bids POST, bids/withdraw POST
│   └── portal/
│       ├── admin/              Dashboard, Cycles (+new +[id]), Courses (+new +[id]), Students,
│       │                       Professors, Rounds, Analytics, Audit, Notifications, Settings
│       ├── professor/          Dashboard, Courses (+[id]), Demand, Allocations, Notifications
│       └── student/            Dashboard, Catalog, Bids, Allocations, History, Notifications, Summary
├── components/
│   ├── ui/                     Button, Card, Badge, Input, Dialog, Select, Tabs, Table, Progress
│   └── layout/                 PublicHeader, PublicFooter, PortalSidebar
└── lib/
    ├── auth.ts                 NextAuth JWT credentials provider
    ├── db.ts                   Prisma + libSQL adapter
    ├── bidding-engine.ts       MRB, tie-break, allocation, validation
    ├── audit.ts                Audit log + notification helpers
    ├── constants.ts            Domain enums and defaults
    └── utils.ts                Formatting and color helpers
```

### Database

SQLite (dev) via libSQL. Swap `DATABASE_URL` to PostgreSQL for production — no code changes required.

### Bidding Engine (`src/lib/bidding-engine.ts`)

| Function | Purpose |
|----------|---------|
| `computeMRB` | Returns current clearing price (seatCap-th highest bid, or 0) |
| `validateBid` | Server-side: eligibility, programme, points, active round, MRB |
| `validateWithdrawal` | Checks withdrawal rules per bid status |
| `resolveTieBreak` | Applies CQPI / GRADE / COMPOSITE / LOTTERY / MANUAL policy |
| `allocateCourse` | Full pipeline for one course: sort → fill → tie-break → reimburse |
| `recomputeOfferingMRB` | Called after every bid change |

---

## How to Run a Mock Bidding Cycle

This is a complete walkthrough of the full bidding lifecycle.

### Step 1 — Log in as Admin

Go to [http://localhost:3000/auth/login](http://localhost:3000/auth/login)
`admin@xlri.ac.in` / `demo1234`

### Step 2 — Review the active cycle

The seed has created **"Term 3 Elective Bidding 2025–26"** with:
- 1000 bid points per student
- Round 1 (OPEN), Round 2 (DRAFT)
- 30 course offerings

Go to **Admin → Bidding Cycles** to confirm.

### Step 3 — Set tie-break policies on courses

Go to **Admin → Courses**.
Courses showing "⚠ Missing" in the Tie-break column cannot enter a live round.
Click **Edit** on any such course → **Tie-break Policy** section → select **CQPI (highest first)** → **Set Policy**.

Repeat for all published courses, or use LOTTERY for a quick test.

> A round cannot be opened until all published courses have a declared tie-break policy.

### Step 4 — Verify Round 1 is open

Go to **Admin → Rounds**.
Round 1 should be **OPEN**. If it is DRAFT, click **Open Round**.

### Step 5 — Place bids as a student

Open a new browser window (or incognito).
Log in as `bm001@xlri.ac.in` / `demo1234`.

Go to **Student → Course Catalog**.
You see only BM-eligible and BOTH-eligible courses.

Enter points in the input field on any course card and click **Bid**.
Observe:
- Your available points decrease
- MRB updates on oversubscribed courses in real time (refresh the page)
- WINNING / LOSING status appears

Try bidding on 4–6 courses to simulate realistic behaviour.

### Step 6 — View demand as a professor

Log in as `prof.sharma@xlri.ac.in` / `demo1234`.
Go to **Professor → Demand Analytics**.

You will see live bid counts, average bid, highest bid, programme split, and top 5 bidders for each of your courses.

### Step 7 — Close Round 1 (Admin)

Back as admin:
**Admin → Rounds** → click **Close Round** next to Round 1.

This transitions all BIDDING_OPEN courses to BIDDING_CLOSED and records the close time.

### Step 8 — Run the allocation engine

Round 1 now shows a **Run Allocation** button.
Click it → confirm.

The engine for each course:
1. Sorts active bids descending by points
2. Awards seats to top `seatCap` bidders
3. Resolves any tie at the clearing line using the declared tie-break policy
4. Marks winners TENTATIVE, losers REIMBURSED
5. Updates every student's point account
6. Logs all decisions to the audit trail

You will see: **"Done: X winners, Y reimbursed"**

### Step 9 — View results

**As student** (`bm001@xlri.ac.in`):
- **My Bids** — WINNING / REIMBURSED statuses
- **My Allocations** — TENTATIVE allocations with points paid
- **Bid History** — timeline of every bid action
- **Summary** — full breakdown with point account balance

**As professor**:
- **Allocations** — full roster of students allocated to each course

### Step 10 — Open Round 2 / Confirmation round

Back as admin:
- Go to **Admin → Cycles** → **Manage** the cycle
- Click **Add Round** if Round 2 doesn't exist, or go to **Admin → Rounds**
- Set Round 2 as **Confirmation Round** if desired
- Click **Open Round**

Students can now confirm or withdraw from tentative allocations during the confirmation window.

### Step 11 — Confirm results

After the confirmation window closes:
- Click **Close Round** on Round 2
- Click **Run Allocation** if it's a standard round, or
- Click **Confirm Results** to finalise tentative allocations

### Step 12 — Review audit log

Go to **Admin → Audit Log**.
Every bid, withdrawal, allocation, and tie-break decision is logged with:
- Actor (user who triggered the action)
- Timestamp
- Before / after JSON
- IP address

---

## Platform Guide by Role

### Admin

| Task | Navigation |
|------|------------|
| Create bidding cycle | Admin → Cycles → New Cycle |
| Edit cycle settings | Admin → Cycles → [Cycle Name] |
| Add rounds to a cycle | Admin → Cycles → [Cycle] → Add Round |
| Create course offering | Admin → Courses → New Offering |
| Edit course + set tie-break | Admin → Courses → [Course] |
| Open / close a round | Admin → Rounds → Open Round / Close Round |
| Run allocation engine | Admin → Rounds → Run Allocation (shown when CLOSED) |
| Broadcast notification | Admin → Notifications → Send Notification form |
| View oversubscription | Admin → Analytics |
| Full audit trail | Admin → Audit Log |
| System settings | Admin → Settings |

### Professor

| Task | Navigation |
|------|------------|
| Edit course description, schedule, goals | Professor → My Courses → [Course] |
| Declare tie-break policy | Professor → My Courses → [Course] → Tie-break Policy |
| Publish course | Set status to Published in course edit form |
| View live demand | Professor → Demand Analytics |
| View allocation roster | Professor → Allocations |

### Student

| Task | Navigation |
|------|------------|
| Browse courses | Student → Course Catalog |
| Place a bid | Course Catalog → enter points → Bid |
| Update bid | Course Catalog → edit points → Update |
| Withdraw (losing) | My Bids → Withdraw (points reimbursed immediately) |
| Withdraw (winning) | Reduce bid to 0 first, then Withdraw |
| View bid status | Student → My Bids |
| View allocations | Student → My Allocations |
| Full timeline | Student → Bid History |
| Summary + point accounts | Student → Summary |

---

## Business Rules Reference

### MRB (Minimum Required Bid)
- The `seatCap`-th highest active bid for a course
- 0 if fewer active bids than available seats
- Recomputed server-side after every bid change
- Displayed live in the course catalog

### Withdrawal rules
| Scenario | Rule |
|----------|------|
| Losing bid | Can withdraw anytime — points reimbursed |
| Winning bid, points > 0 | Cannot withdraw |
| Winning bid, points = 0 | Can withdraw (only possible when MRB = 0) |
| Confirmation round | Can withdraw any tentative allocation |

### Tie-break (pre-declared, auditable)
| Method | How it works |
|--------|-------------|
| CQPI_DESC | Higher CQPI wins. Fully automated. |
| GRADE_DESC | Higher grade in specified prerequisite wins. Requires course code. |
| COMPOSITE_RANK | Weighted combination of CQPI + grade. Specify weights as JSON. |
| LOTTERY | Random with reproducible seed. Logged. |
| MANUAL_RANK | Admin/professor uploads ranked list of roll numbers. |

Rules:
- Must be declared before a round opens
- Locked once a round opens — cannot change without override
- All tie-break inputs and outcomes logged

### Programme eligibility
- BM-only courses: invisible to HRM students, API-level validation blocks forged requests
- HRM-only courses: invisible to BM students, API-level validation blocks forged requests
- BOTH: visible and biddable by all eligible students

### Points accounting
```
Available = totalPoints - reservedPoints - usedPoints

reservedPoints  = sum of active bids
usedPoints      = sum of points paid on confirmed allocations
```

---

## API Reference

### Student endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/student/bids` | STUDENT | Place or update a bid |
| POST | `/api/student/bids/withdraw` | STUDENT | Withdraw a bid |

### Admin endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/cycles` | ADMIN | List all cycles |
| POST | `/api/admin/cycles` | ADMIN | Create cycle |
| GET | `/api/admin/cycles/[id]` | ADMIN | Get cycle detail |
| PATCH | `/api/admin/cycles/[id]` | ADMIN | Update cycle |
| POST | `/api/admin/courses` | ADMIN | Create course offering |
| GET | `/api/admin/courses/[id]` | ADMIN | Get offering detail |
| PATCH | `/api/admin/courses/[id]` | ADMIN | Update offering |
| POST | `/api/admin/courses/[id]/tiebreak` | ADMIN | Set/update tie-break |
| POST | `/api/admin/rounds` | ADMIN | Create round |
| PATCH | `/api/admin/rounds/[id]/status` | ADMIN | Transition round status |
| POST | `/api/admin/allocate` | ADMIN | Run allocation engine |
| POST | `/api/admin/notifications` | ADMIN | Broadcast notification |
| GET | `/api/admin/terms` | ADMIN | List academic terms |
| GET | `/api/admin/professors-list` | ADMIN | List professors |
| GET | `/api/admin/courses-list` | ADMIN | List base courses |

### Professor endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/professor/courses/[id]` | PROFESSOR | Get course detail |
| PATCH | `/api/professor/courses/[id]` | PROFESSOR | Update course |
| POST | `/api/professor/courses/[id]/tiebreak` | PROFESSOR | Set/update tie-break |

All endpoints validate session server-side. Professor endpoints additionally verify ownership of the offering.

---

## Deployment

### Environment variables

```env
DATABASE_URL="postgresql://user:password@host:5432/bidscholar"
NEXTAUTH_SECRET="<32+ char random string>"
NEXTAUTH_URL="https://yourdomain.com"
```

### Switch to PostgreSQL

1. Update `DATABASE_URL`
2. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`
3. In `src/lib/db.ts`, remove the libSQL adapter and use standard Prisma client:
   ```ts
   import { PrismaClient } from "@prisma/client";
   export const db = new PrismaClient();
   ```

### Build and deploy

```bash
npm run build
npx prisma migrate deploy
npx prisma db seed
npm start
```

---

## Known TODOs

- [ ] Email notifications (hook `broadcastNotification` into a mailer like Resend or Nodemailer)
- [ ] Student bulk import via CSV (ImportJob model exists, UI not yet built)
- [ ] Professor bulk import
- [ ] Waitlist promotion (WaitlistEntry model exists)
- [ ] Credit constraint enforcement at bid time (advisory only currently)
- [ ] Admin manual allocation override UI
- [ ] Forgot password (requires email provider)
- [ ] Export allocation results to CSV/PDF
- [ ] Create AcademicTerm via Admin UI (currently seed or Prisma Studio only)
- [ ] Admin create/manage Batches via UI
