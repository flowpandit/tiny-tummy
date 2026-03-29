ALTER TABLE diet_logs ADD COLUMN amount_ml INTEGER;
ALTER TABLE diet_logs ADD COLUMN duration_minutes INTEGER;
ALTER TABLE diet_logs ADD COLUMN breast_side TEXT;
ALTER TABLE diet_logs ADD COLUMN bottle_content TEXT;
ALTER TABLE diet_logs ADD COLUMN reaction_notes TEXT;
ALTER TABLE diet_logs ADD COLUMN is_constipation_support INTEGER NOT NULL DEFAULT 0;
