-- Check current file_type enum values
SELECT enumlabel FROM pg_enum WHERE enumtypid = (
  SELECT oid FROM pg_type WHERE typname = 'file_type'
);

-- If the enum doesn't have the values we need, let's update it
-- First, let's see what file types we might need
DO $$
BEGIN
  -- Add image type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'image' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'file_type')) THEN
    ALTER TYPE file_type ADD VALUE 'image';
  END IF;
  
  -- Add video type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'video' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'file_type')) THEN
    ALTER TYPE file_type ADD VALUE 'video';
  END IF;
  
  -- Add audio type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'audio' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'file_type')) THEN
    ALTER TYPE file_type ADD VALUE 'audio';
  END IF;
  
  -- Add document type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'document' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'file_type')) THEN
    ALTER TYPE file_type ADD VALUE 'document';
  END IF;
END $$;