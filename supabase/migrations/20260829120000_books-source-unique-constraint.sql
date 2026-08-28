-- Root cause of the 2026-08-26 Ed/davison stuck-payment incident: the
-- pre-existing trg_books_sync_product_sale trigger (books_sync_product_sale())
-- on product_bestowals has always used `ON CONFLICT (source_table, source_id)`
-- against both books_income and expenses -- but neither table has ever had a
-- unique constraint matching that clause. Postgres raises a hard error
-- ("there is no unique or exclusion constraint matching the ON CONFLICT
-- specification") the moment that INSERT actually runs, which only happens
-- when the sower on the sale has a books_enabled company. Because it's an
-- AFTER INSERT trigger, the error aborts the entire finalize_basket_order
-- transaction -- rolling back the product_bestowals insert, the
-- basket_orders status update, everything -- even though PayPal had already
-- captured the buyer's money. The order was left neither completed nor
-- failed, and sat until an unrelated janitorial job (expire_stale_orders)
-- marked it expired days later.
--
-- Verified no existing duplicate (source_table, source_id) pairs in either
-- table before adding these -- safe to apply.
ALTER TABLE public.books_income
  ADD CONSTRAINT books_income_source_unique UNIQUE (source_table, source_id);

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_source_unique UNIQUE (source_table, source_id);
