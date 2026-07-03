-- ============================================================
-- Portfolio Tracker — Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ------------------------------------------------------------
-- 1. STOCKS TABLE
-- One row per position you've ever held (active or exited).
-- ------------------------------------------------------------
create table if not exists stocks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) default auth.uid(),
  symbol      text not null,              -- e.g. 'RELIANCE', 'TCS' (NSE symbol, no suffix)
  quantity    numeric not null check (quantity > 0),
  avg_price   numeric not null check (avg_price > 0),
  entry_date  date not null default current_date,
  exit_date   date,                        -- null while still holding
  status      text not null default 'active' check (status in ('active', 'exited')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_stocks_user_id on stocks(user_id);
create index if not exists idx_stocks_status on stocks(status);

-- ------------------------------------------------------------
-- 2. DAILY_PRICES TABLE
-- One row per stock per trading day.
-- ------------------------------------------------------------
create table if not exists daily_prices (
  id          uuid primary key default gen_random_uuid(),
  stock_id    uuid not null references stocks(id) on delete cascade,
  date        date not null,
  close_price numeric not null check (close_price > 0),
  created_at  timestamptz not null default now(),
  unique (stock_id, date)   -- prevents duplicate rows for the same day
);

create index if not exists idx_daily_prices_stock_id on daily_prices(stock_id);
create index if not exists idx_daily_prices_date on daily_prices(date);

-- ------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- Only the logged-in owner can see or modify their own data.
-- The Edge Function will use the service_role key, which
-- bypasses RLS entirely — so it can insert prices for anyone.
-- ------------------------------------------------------------
alter table stocks enable row level security;
alter table daily_prices enable row level security;

-- --- stocks policies ---
create policy "Users can view their own stocks"
  on stocks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own stocks"
  on stocks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own stocks"
  on stocks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own stocks"
  on stocks for delete
  using (auth.uid() = user_id);

-- --- daily_prices policies ---
-- daily_prices has no user_id column directly, so we check
-- ownership via the parent stocks row.
create policy "Users can view prices for their own stocks"
  on daily_prices for select
  using (
    exists (
      select 1 from stocks
      where stocks.id = daily_prices.stock_id
      and stocks.user_id = auth.uid()
    )
  );

-- No insert/update/delete policies for daily_prices for regular users —
-- only the Edge Function (service_role) writes to this table.

-- ------------------------------------------------------------
-- 4. HELPER VIEW — total portfolio value per day
-- Sums (quantity * close_price) across all ACTIVE stocks per date,
-- scoped automatically to the logged-in user via RLS on the
-- underlying tables (security_invoker means the view respects
-- the caller's RLS, not the view creator's).
-- ------------------------------------------------------------
create or replace view portfolio_daily_value
with (security_invoker = true) as
select
  dp.date,
  sum(dp.close_price * s.quantity) as total_value,
  sum(s.avg_price * s.quantity) as total_invested
from daily_prices dp
join stocks s on s.id = dp.stock_id
where s.status = 'active'
group by dp.date
order by dp.date;

-- ============================================================
-- Done. Next: enable Email/Password auth under
-- Authentication → Providers → Email in the Supabase dashboard,
-- then create your own login user under Authentication → Users.
-- ============================================================
