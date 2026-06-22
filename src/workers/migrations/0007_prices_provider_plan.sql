-- 0007_prices_provider_plan.sql
--
-- Autopay (recurring) support — phase 1.
--
-- For recurring prices we need to register a "Plan" with the upstream provider
-- (Razorpay Plans API in P1; analogous Stripe Prices later). The plan id is
-- one-shot per price — created the first time a recurring price is registered,
-- then reused for every Subscription created against that price. Caching the
-- id on the price row avoids repeatedly hitting the provider catalog.
--
-- The existing `prices.type` ('one_time' | 'recurring') already gates which
-- code path runs; this column just stores the upstream id when type =
-- 'recurring'. Null for 'one_time' rows (and for recurring rows that haven't
-- been registered with the provider yet — registration is lazy).

ALTER TABLE prices ADD COLUMN provider_plan_id TEXT;

-- Lookup by provider plan id is useful when reconciling webhook payloads that
-- reference plan_id (Razorpay subscription.* events carry it on the entity).
CREATE INDEX IF NOT EXISTS idx_prices_provider_plan ON prices(provider_plan_id);
