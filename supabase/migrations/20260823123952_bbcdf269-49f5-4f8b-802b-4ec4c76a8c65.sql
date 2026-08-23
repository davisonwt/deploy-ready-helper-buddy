
ALTER TABLE public.payroll_lines
  ALTER COLUMN paye DROP NOT NULL,
  ALTER COLUMN uif_employee DROP NOT NULL,
  ALTER COLUMN uif_employer DROP NOT NULL,
  ALTER COLUMN sdl DROP NOT NULL;

ALTER TABLE public.payroll_lines
  ADD COLUMN IF NOT EXISTS employee_statutory numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_statutory numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text;

ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS currency text;
