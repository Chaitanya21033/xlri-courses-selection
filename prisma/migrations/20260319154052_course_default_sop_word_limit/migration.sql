-- Add defaultSopWordLimit to Course model.
-- This stores the professor's SOP word-limit preference when they propose a course
-- using SOP_SCORE as their preferred tie-break / ranking method.
-- The value is carried over to CourseOffering.sopWordLimit when admin links the course to a cycle.

ALTER TABLE "Course" ADD COLUMN "defaultSopWordLimit" INTEGER;
