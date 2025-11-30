-- Create ambassador_applications table for vetting and manual review
CREATE TABLE IF NOT EXISTS ambassador_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  current_role TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  brand_name TEXT,
  why_represent TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ambassador_applications_user_id ON ambassador_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_ambassador_applications_status ON ambassador_applications(status);
CREATE INDEX IF NOT EXISTS idx_ambassador_applications_email ON ambassador_applications(email);
CREATE INDEX IF NOT EXISTS idx_ambassador_applications_created_at ON ambassador_applications(created_at DESC);

-- Enable RLS
ALTER TABLE ambassador_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own applications
CREATE POLICY "Users can insert their own ambassador applications"
  ON ambassador_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can view their own applications
CREATE POLICY "Users can view their own ambassador applications"
  ON ambassador_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can view all applications
CREATE POLICY "Admins can view all ambassador applications"
  ON ambassador_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_progress
      WHERE user_progress.user_id = auth.uid()
      AND user_progress.level >= 30
    )
  );

-- Policy: Admins can update applications (for review)
CREATE POLICY "Admins can update ambassador applications"
  ON ambassador_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_progress
      WHERE user_progress.user_id = auth.uid()
      AND user_progress.level >= 30
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ambassador_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_ambassador_applications_updated_at
  BEFORE UPDATE ON ambassador_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_ambassador_applications_updated_at();

-- Add comment
COMMENT ON TABLE ambassador_applications IS 'Stores ambassador applications with vetting and manual review process';

