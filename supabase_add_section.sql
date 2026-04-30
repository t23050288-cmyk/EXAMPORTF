-- Add section column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS section TEXT DEFAULT '';
-- Add section to exam_status too
ALTER TABLE exam_status ADD COLUMN IF NOT EXISTS section TEXT DEFAULT '';
