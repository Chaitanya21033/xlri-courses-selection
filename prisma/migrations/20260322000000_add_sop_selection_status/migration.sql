-- Add sopSelectionStatus to Bid model.
-- Professor can mark each SOP applicant as SELECTED, MAYBE, or NOT_SELECTED.
-- This drives the final ranking order: SELECTED first, then MAYBE, then NOT_SELECTED,
-- with SOP score as the secondary sort within each group.

ALTER TABLE "Bid" ADD COLUMN "sopSelectionStatus" TEXT;
