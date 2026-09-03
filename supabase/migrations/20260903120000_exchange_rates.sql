-- USD is the app's stored base currency everywhere (expenses.currency,
-- books_income.currency are hardcoded 'USD'; every price/amount column in
-- the app is a USD figure). This table caches live USD-per-currency rates
-- so display code can convert at render time instead of relabeling a USD
-- number with a foreign currency code (the "ZAR 29.93 for $29.93" bug).
--
-- One row per currency, upserted in place by refresh-exchange-rates
-- (scheduled hourly below). A fetch failure just leaves the existing row
-- untouched -- last-known rate is the fallback, never a blocking error.
CREATE TABLE public.exchange_rates (
  currency text PRIMARY KEY,
  usd_rate numeric NOT NULL CHECK (usd_rate > 0), -- 1 USD = usd_rate units of `currency`
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.exchange_rates (currency, usd_rate) VALUES ('USD', 1);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Rates are not sensitive and every signed-in page needs to read them to
-- render a price -- public read, service-role-only writes (same shape as
-- other reference tables in this app).
CREATE POLICY "exchange_rates_select_all"
  ON public.exchange_rates FOR SELECT
  USING (true);

SELECT cron.schedule(
  'refresh-exchange-rates',
  '7 * * * *', -- hourly, offset off the hour so it doesn't pile up with other jobs
  $$ SELECT public.invoke_money_job('refresh-exchange-rates'); $$
);
