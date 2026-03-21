-- Expand allowed document types
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_type_check 
CHECK (type IN ('LAB_RESULT', 'PRESCRIPTION', 'RADIOLOGY', 'CONSULTATION_NOTE', 'VACCINATION_RECORD', 'DISCHARGE_SUMMARY'));
