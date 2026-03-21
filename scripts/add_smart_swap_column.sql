-- Add smart_swap_advice column to documents table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='smart_swap_advice') THEN
        ALTER TABLE documents ADD COLUMN smart_swap_advice TEXT;
    END IF;
END $$;
