ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

ALTER TABLE public.quotes ADD CONSTRAINT quotes_status_check CHECK (status IN ('draft','sent','accepted','rejected'));