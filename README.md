# Portfolio Ledger

A private, single-user portfolio tracker for Indian (NSE) stocks.
React + Vite frontend on GitHub Pages, Supabase for the database and
login, and a GitHub Actions job that fetches daily close prices from
Yahoo Finance for free.

- Login-protected dashboard (only you can see your data)
- Total portfolio value chart — 1 Week / 1 Month / 1 Year / All
- Per-stock detail page with its own chart and avg-price reference line
- Add / exit positions by editing rows directly in Supabase
- Daily close prices fetched automatically, at no cost

---

## How it fits together

```
GitHub Actions (daily cron)  →  Yahoo Finance  →  Supabase (daily_prices)
                                                          │
GitHub Pages (React app)  ←───────────────────────  reads via Supabase REST API
        │
   Supabase Auth (email + password login)
```

You never run a server. Supabase is the database + auth backend,
GitHub Actions is the daily "cron job," and GitHub Pages hosts the
static frontend.

---

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier is enough).
2. Go to **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and run it.
   This creates the `stocks` and `daily_prices` tables, locks them
   down with Row Level Security, and adds a `portfolio_daily_value`
   view used by the total portfolio chart.
3. Go to **Authentication → Providers** and make sure **Email** is enabled.
4. Go to **Authentication → Users → Add user** and create your own
   login (the email + password you'll use to sign in to the dashboard).
   Disable "public sign-ups" isn't necessary — there's no sign-up
   page in this app at all, only a login form, so nobody can create
   an account through the site.
5. Collect three values you'll need later, all under
   **Project Settings → API**:
   - **Project URL** (`SUPABASE_URL`)
   - **anon public key** (`VITE_SUPABASE_ANON_KEY`) — safe to expose
     publicly, RLS keeps your data private even with this key
   - **service_role key** (`SUPABASE_SERVICE_ROLE_KEY`) — **secret**,
     bypasses RLS, only used by the GitHub Actions price-fetch job.
     Never put this in the frontend or commit it anywhere.

### Adding your stocks

For now, add and edit positions directly in Supabase:
**Table Editor → stocks → Insert row**.

Fields:
| Column | What to put |
|---|---|
| `user_id` | Your own user ID — copy it from **Authentication → Users** |
| `symbol` | NSE symbol, no suffix (e.g. `RELIANCE`, `TCS`, `INFY`) |
| `quantity` | Number of shares |
| `avg_price` | Your average buy price |
| `entry_date` | Date you started the position |
| `status` | `active` (or `exited` once you sell) |

**When you exit a position:** set `status` to `exited` and fill in
`exit_date`. Exited stocks stop showing up in the total portfolio
chart but stay visible (marked "Exited") in your holdings table and
keep their own price history.

---

## 2. Local development

```bash
npm install
cp .env.example .env
# edit .env with your Supabase URL + anon key
npm run dev
```

Open the local URL it prints. You'll land on the login page — sign
in with the user you created in Supabase.

---

## 3. Deploy to GitHub Pages

1. Push this project to a new GitHub repo.
2. **Repo Settings → Pages → Source → GitHub Actions.**
3. **Repo Settings → Secrets and variables → Actions → New repository secret.**
   Add these four secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL` (same value as above, duplicated because the two
     workflows read different env var names)
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Open [`vite.config.js`](./vite.config.js) and set `base` to match
   your repo name exactly, e.g. `/portfolio-tracker/`. If your repo
   is named `yourname.github.io`, set `base: '/'` instead.
5. Push to `main`. The **Deploy to GitHub Pages** workflow
   (`.github/workflows/deploy.yml`) builds the app and publishes it
   automatically. Check the **Actions** tab for progress; your site
   URL appears there once it finishes.

Every future push to `main` redeploys automatically.

---

## 4. The daily price fetch

`.github/workflows/fetch-prices.yml` runs on a schedule
(**11:00 UTC / 4:30 PM IST, weekdays**) and calls
`scripts/fetch-prices.js`, which:

1. Reads all your `active` stocks from Supabase
2. Fetches each one's latest close price from Yahoo Finance
   (`SYMBOL.NS`)
3. Upserts the result into `daily_prices`

It costs nothing — GitHub Actions gives 2,000 free minutes/month on
private repos (this job takes seconds), and Supabase's free tier
covers this database size many times over.

**To test it immediately** instead of waiting for the schedule: go
to the **Actions** tab → **Fetch daily close prices** → **Run
workflow**. Check the run logs, then check the `daily_prices` table
in Supabase to confirm rows appeared.

**Note on timing:** Yahoo Finance's data can lag slightly after
market close. If a run ever picks up yesterday's price instead of
today's, it'll self-correct the next day — the script always writes
the most recent close it can find, and `upsert` means it can also
safely re-run without creating duplicates.

---

## 5. Project structure

```
supabase/schema.sql          Database tables, RLS policies, portfolio view
scripts/fetch-prices.js      Daily price-fetch script (run by GitHub Actions)
.github/workflows/
  fetch-prices.yml           Scheduled job: fetch prices → Supabase
  deploy.yml                 Build + deploy to GitHub Pages on push
src/
  supabaseClient.js          Supabase client (uses the public anon key)
  context/AuthContext.jsx    Login session state
  components/
    ProtectedRoute.jsx       Redirects to /login if not signed in
    RangeToggle.jsx          1W / 1M / 1Y / All selector
    PortfolioChart.jsx       Total portfolio value chart
    StockChart.jsx           Per-stock price chart with avg-price line
    StockTable.jsx           Holdings table on the dashboard
  pages/
    Login.jsx
    Dashboard.jsx            Total value + holdings table
    StockDetail.jsx          Single stock's chart + stats
```

---

## 6. Common tweaks

- **Change the fetch time:** edit the cron expression in
  `fetch-prices.yml`. Cron times are in UTC — IST is UTC+5:30.
- **Add BSE support:** the fetch script hardcodes the `.NS` (NSE)
  suffix. To fetch from BSE instead, change it to `.BO` in
  `scripts/fetch-prices.js`.
- **Currency:** all values are formatted as INR (`en-IN` locale) in
  the chart and table components — search for `formatINR` if you
  need to change it.

---

## Costs

At personal-portfolio scale (a handful of stocks, one daily
GitHub Actions run, low personal traffic to the dashboard), this
entire project runs **free**:
- GitHub Pages: free for public repos, free minutes cover private too
- GitHub Actions: 2,000 free minutes/month (this job uses a few seconds/day)
- Supabase free tier: 500 MB database, 50,000 monthly active users,
  500,000 Edge Function invocations — all far beyond what this needs
