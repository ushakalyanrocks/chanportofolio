// fetch-prices-auth.js
//
// Same as fetch-prices.js but WITHOUT the service_role key.
// Logs in as your own app user (email + password) and writes prices
// under your identity — RLS applies, so it can only touch your rows.
//
// Requires the extra RLS policies from add-user-price-write-policies.sql
// to be applied first (daily_prices insert/update for own stocks).
//
// Env vars:
//   SUPABASE_URL        e.g. https://xxxx.supabase.co
//   SUPABASE_ANON_KEY   the public anon key (same one the frontend uses)
//   APP_USER_EMAIL      your dashboard login email
//   APP_USER_PASSWORD   your dashboard login password
//
// PowerShell example:
//   $env:SUPABASE_URL = "https://xxxx.supabase.co"
//   $env:SUPABASE_ANON_KEY = "eyJ..."
//   $env:APP_USER_EMAIL = "you@example.com"
//   $env:APP_USER_PASSWORD = Read-Host "Password"
//   node scripts/fetch-prices-auth.js

import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_ANON_KEY, APP_USER_EMAIL, APP_USER_PASSWORD } =
  process.env

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !APP_USER_EMAIL || !APP_USER_PASSWORD) {
  console.error(
    'Missing env vars. Need SUPABASE_URL, SUPABASE_ANON_KEY, APP_USER_EMAIL, APP_USER_PASSWORD.'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function fetchCloseFromYahoo(symbol) {
  const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=5d&interval=1d`

  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) {
    throw new Error(`Yahoo Finance request failed for ${yahooSymbol}: ${res.status}`)
  }

  const json = await res.json()
  const result = json?.chart?.result?.[0]
  if (!result) throw new Error(`No chart data returned for ${yahooSymbol}`)

  const timestamps = result.timestamp
  const closes = result.indicators?.quote?.[0]?.close
  if (!timestamps || !closes) throw new Error(`Malformed chart data for ${yahooSymbol}`)

for (let i = timestamps.length - 1; i >= 0; i--) {
    if (closes[i] != null) {
      const date = new Date(timestamps[i] * 1000).toISOString().slice(0, 10)
      return { date, close: Math.round(closes[i] * 100) / 100 }
    }
  }
  throw new Error(`No valid close price found for ${yahooSymbol}`)
}

async function main() {
  // 1. Log in as the app user — no browser needed, this IS the login.
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: APP_USER_EMAIL,
    password: APP_USER_PASSWORD,
  })
  if (loginError) {
    console.error('Login failed:', loginError.message)
    process.exit(1)
  }
  console.log(`Logged in succcessfully`)

  // 2. Read active stocks — RLS automatically scopes this to your rows.
  const { data: stocks, error } = await supabase
    .from('stocks')
    .select('id, symbol')
    .eq('status', 'active')

  if (error) {
    console.error('Failed to fetch stocks:', error.message)
    process.exit(1)
  }
  if (!stocks || stocks.length === 0) {
    console.log('No active stocks found. Nothing to fetch.')
    await supabase.auth.signOut()
    return
  }

  console.log(`Fetching close prices for ${stocks.length} stock(s)...`)

  const results = await Promise.allSettled(
    stocks.map(async (stock) => {
      const { date, close } = await fetchCloseFromYahoo(stock.symbol)
      const { error: upsertError } = await supabase
        .from('daily_prices')
        .upsert(
          { stock_id: stock.id, date, close_price: close },
          { onConflict: 'stock_id,date' }
        )
      if (upsertError) throw new Error(`${stock.symbol}: ${upsertError.message}`)
      console.log(`  ${stock.symbol}: ${close} on ${date}`)
    })
  )

  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length > 0) {
    console.error(`${failed.length} stock(s) failed:`)
    failed.forEach((f) => console.error('  -', f.reason?.message || f.reason))
  }

  await supabase.auth.signOut()
  console.log('Done.')
  if (failed.length > 0) process.exit(1)
}

main()
