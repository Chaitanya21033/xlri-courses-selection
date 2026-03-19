-- Rename sopCharacterLimit → sopWordLimit on CourseOffering.
-- The original column stored a character cap; this migration
-- renames it to sopWordLimit and resets any existing values to NULL
-- because character counts are not comparable to word counts.
-- Professors will need to re-configure their SOP word limits.

ALTER TABLE "CourseOffering"
  RENAME COLUMN "sopCharacterLimit" TO "sopWordLimit";

-- Clear existing values: character-count numbers are not valid word counts
UPDATE "CourseOffering" SET "sopWordLimit" = NULL;
