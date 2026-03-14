-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "createdByProfessorId" TEXT,
ADD COLUMN     "defaultEligibility" TEXT DEFAULT 'BOTH',
ADD COLUMN     "defaultSeatCap" INTEGER DEFAULT 40,
ADD COLUMN     "termNumber" INTEGER;
