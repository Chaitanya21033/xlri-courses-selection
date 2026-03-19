-- DropForeignKey
ALTER TABLE "AllocationResult" DROP CONSTRAINT "AllocationResult_studentProfileId_fkey";

-- DropForeignKey
ALTER TABLE "PointAccount" DROP CONSTRAINT "PointAccount_studentProfileId_fkey";

-- DropForeignKey
ALTER TABLE "StudentCourseGrade" DROP CONSTRAINT "StudentCourseGrade_studentProfileId_fkey";

-- DropForeignKey
ALTER TABLE "WaitlistEntry" DROP CONSTRAINT "WaitlistEntry_studentProfileId_fkey";

-- AlterTable
ALTER TABLE "Bid" ADD COLUMN     "sopScore" INTEGER,
ADD COLUMN     "sopScoredAt" TIMESTAMP(3),
ADD COLUMN     "sopScoredById" TEXT,
ADD COLUMN     "sopSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "sopText" TEXT;

-- AlterTable
ALTER TABLE "CourseOffering" ADD COLUMN     "requiresSop" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sopCharacterLimit" INTEGER;

-- AddForeignKey
ALTER TABLE "PointAccount" ADD CONSTRAINT "PointAccount_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationResult" ADD CONSTRAINT "AllocationResult_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCourseGrade" ADD CONSTRAINT "StudentCourseGrade_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
