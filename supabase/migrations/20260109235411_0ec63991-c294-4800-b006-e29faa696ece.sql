-- Create enum for coaching request status
CREATE TYPE public.coaching_request_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

-- Create enum for client training experience level
CREATE TYPE public.training_experience AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create enum for client goals
CREATE TYPE public.fitness_goal AS ENUM ('lose_fat', 'gain_muscle', 'performance', 'general_fitness', 'other');

-- Create coaching_requests table
CREATE TABLE public.coaching_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  status coaching_request_status NOT NULL DEFAULT 'pending',
  goal fitness_goal NOT NULL,
  experience training_experience NOT NULL,
  availability_days INTEGER NOT NULL CHECK (availability_days >= 1 AND availability_days <= 7),
  message TEXT,
  coach_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.coaching_requests ENABLE ROW LEVEL SECURITY;

-- Clients can view their own requests
CREATE POLICY "Clients can view their own requests"
ON public.coaching_requests
FOR SELECT
USING (auth.uid() = client_id);

-- Clients can create requests
CREATE POLICY "Clients can create requests"
ON public.coaching_requests
FOR INSERT
WITH CHECK (auth.uid() = client_id);

-- Clients can cancel their pending requests
CREATE POLICY "Clients can cancel pending requests"
ON public.coaching_requests
FOR UPDATE
USING (auth.uid() = client_id AND status = 'pending')
WITH CHECK (auth.uid() = client_id AND status = 'cancelled');

-- Coaches can view requests sent to them
CREATE POLICY "Coaches can view their requests"
ON public.coaching_requests
FOR SELECT
USING (auth.uid() = coach_id);

-- Coaches can update requests (accept/reject)
CREATE POLICY "Coaches can respond to requests"
ON public.coaching_requests
FOR UPDATE
USING (auth.uid() = coach_id AND status = 'pending')
WITH CHECK (auth.uid() = coach_id AND status IN ('accepted', 'rejected'));

-- Create updated_at trigger
CREATE TRIGGER update_coaching_requests_updated_at
BEFORE UPDATE ON public.coaching_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient queries
CREATE INDEX idx_coaching_requests_coach_status ON public.coaching_requests(coach_id, status);
CREATE INDEX idx_coaching_requests_client_status ON public.coaching_requests(client_id, status);