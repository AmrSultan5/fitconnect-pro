-- Create inbody_records table for tracking body composition
CREATE TABLE public.inbody_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC NOT NULL,
  skeletal_muscle_kg NUMERIC NOT NULL,
  body_fat_percentage NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one record per user per date
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.inbody_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own inbody records"
ON public.inbody_records
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can view their clients inbody records"
ON public.inbody_records
FOR SELECT
USING (is_coach_of_client(auth.uid(), user_id));

-- Create index for efficient queries
CREATE INDEX idx_inbody_records_user_date ON public.inbody_records(user_id, date DESC);