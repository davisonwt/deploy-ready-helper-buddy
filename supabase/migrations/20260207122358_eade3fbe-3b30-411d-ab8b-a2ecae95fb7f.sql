-- Create user_security_questions table for password reset verification
CREATE TABLE public.user_security_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_1 TEXT NOT NULL,
    answer_1_hash TEXT NOT NULL,
    question_2 TEXT NOT NULL,
    answer_2_hash TEXT NOT NULL,
    question_3 TEXT NOT NULL,
    answer_3_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_security_questions ENABLE ROW LEVEL SECURITY;

-- Users can view their own security questions (questions only, not answers)
CREATE POLICY "Users can view own security questions"
ON public.user_security_questions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own security questions
CREATE POLICY "Users can insert own security questions"
ON public.user_security_questions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own security questions
CREATE POLICY "Users can update own security questions"
ON public.user_security_questions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_security_questions_user_id ON public.user_security_questions(user_id);

-- Create function to get questions only (not answers) for password reset - accessible without auth
CREATE OR REPLACE FUNCTION public.get_security_questions_for_reset(user_email TEXT)
RETURNS TABLE (
    question_1 TEXT,
    question_2 TEXT,
    question_3 TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find user by email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = LOWER(user_email);
    
    IF target_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Return questions only
    RETURN QUERY
    SELECT sq.question_1, sq.question_2, sq.question_3
    FROM public.user_security_questions sq
    WHERE sq.user_id = target_user_id;
END;
$$;