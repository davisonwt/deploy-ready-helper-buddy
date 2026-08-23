CREATE OR REPLACE FUNCTION public.owns_company(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = _company_id AND c.owner_user_id = auth.uid()
  )
$$;

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid')),
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_owner_all" ON public.invoices FOR ALL TO authenticated
  USING (public.owns_company(business_id)) WITH CHECK (public.owns_company(business_id));
CREATE INDEX idx_invoices_business ON public.invoices(business_id, created_at DESC);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  category text NOT NULL DEFAULT 'Other'
    CHECK (category IN ('Software','Travel','Meals','Office','Marketing','Payroll','Other')),
  receipt_image_path text,
  merchant text,
  spent_on date,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_owner_all" ON public.expenses FOR ALL TO authenticated
  USING (public.owns_company(business_id)) WITH CHECK (public.owns_company(business_id));
CREATE INDEX idx_expenses_business ON public.expenses(business_id, created_at DESC);

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  pay_type text NOT NULL DEFAULT 'salary' CHECK (pay_type IN ('salary','hourly')),
  monthly_salary numeric(14,2),
  hourly_rate numeric(14,2),
  hours_per_month numeric(8,2),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees_owner_all" ON public.employees FOR ALL TO authenticated
  USING (public.owns_company(business_id)) WITH CHECK (public.owns_company(business_id));
CREATE INDEX idx_employees_business ON public.employees(business_id);

CREATE TABLE public.employee_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  parsed_terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  parse_status text NOT NULL DEFAULT 'pending' CHECK (parse_status IN ('pending','parsed','failed'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_contracts TO authenticated;
GRANT ALL ON public.employee_contracts TO service_role;
ALTER TABLE public.employee_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employee_contracts_owner_all" ON public.employee_contracts FOR ALL TO authenticated
  USING (public.owns_company(business_id)) WITH CHECK (public.owns_company(business_id));
CREATE INDEX idx_employee_contracts_employee ON public.employee_contracts(employee_id, uploaded_at DESC);

CREATE TABLE public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  pay_date date NOT NULL,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  employer_fica numeric(14,2) NOT NULL DEFAULT 0,
  total_cost numeric(14,2) NOT NULL DEFAULT 0,
  expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_runs TO authenticated;
GRANT ALL ON public.payroll_runs TO service_role;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_runs_owner_all" ON public.payroll_runs FOR ALL TO authenticated
  USING (public.owns_company(business_id)) WITH CHECK (public.owns_company(business_id));
CREATE INDEX idx_payroll_runs_business ON public.payroll_runs(business_id, pay_date DESC);

CREATE TABLE public.payroll_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name text NOT NULL DEFAULT '',
  gross numeric(14,2) NOT NULL DEFAULT 0,
  paye numeric(14,2) NOT NULL DEFAULT 0,
  uif_employee numeric(14,2) NOT NULL DEFAULT 0,
  uif_employer numeric(14,2) NOT NULL DEFAULT 0,
  sdl numeric(14,2) NOT NULL DEFAULT 0,
  deductions numeric(14,2) NOT NULL DEFAULT 0,
  net numeric(14,2) NOT NULL DEFAULT 0,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_lines TO authenticated;
GRANT ALL ON public.payroll_lines TO service_role;
ALTER TABLE public.payroll_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_lines_owner_all" ON public.payroll_lines FOR ALL TO authenticated
  USING (public.owns_company(business_id)) WITH CHECK (public.owns_company(business_id));
CREATE INDEX idx_payroll_lines_run ON public.payroll_lines(payroll_run_id);

CREATE TABLE public.tax_settings (
  business_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  paye_pct numeric(6,3) NOT NULL DEFAULT 18,
  uif_ceiling numeric(14,2) NOT NULL DEFAULT 17712,
  sdl_applies boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_settings TO authenticated;
GRANT ALL ON public.tax_settings TO service_role;
ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tax_settings_owner_all" ON public.tax_settings FOR ALL TO authenticated
  USING (public.owns_company(business_id)) WITH CHECK (public.owns_company(business_id));

CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "books_docs_owner_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'books-docs' AND public.owns_company(((storage.foldername(name))[1])::uuid));
CREATE POLICY "books_docs_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'books-docs' AND public.owns_company(((storage.foldername(name))[1])::uuid));
CREATE POLICY "books_docs_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'books-docs' AND public.owns_company(((storage.foldername(name))[1])::uuid));
CREATE POLICY "books_docs_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'books-docs' AND public.owns_company(((storage.foldername(name))[1])::uuid));