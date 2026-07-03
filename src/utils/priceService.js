import { supabase } from '../supabaseClient'

/**
 * Fetch and update prices for all active stocks — on demand.
 * Called from Dashboard "Refresh Prices" button.
 *
 * Yahoo Finance blocks browser requests (no CORS headers), so the actual
 * fetching happens server-side in the `clever-handler` Supabase Edge Function.
 * supabase.functions.invoke() automatically attaches the logged-in user's JWT,
 * so the function runs under the user's identity and RLS applies as usual.
 */
export async function refreshPrices() {
  const { data, error } = await supabase.functions.invoke('clever-handler')

  if (error) {
    // FunctionsHttpError → the function ran but returned a non-2xx status;
    // try to surface its JSON error message.
    let message = error.message || 'Failed to refresh prices'
    try {
      if (error.context && typeof error.context.json === 'function') {
        const body = await error.context.json()
        if (body?.error) message = body.error
      }
    } catch {
      // ignore — keep the generic message
    }
    console.error('Price refresh error:', message)
    throw new Error(message)
  }

  // Partial failures come back with success: false but still HTTP 200,
  // so succeeded stocks are saved and we can report both.
  if (data && data.success === false) {
    const detail = (data.errors || []).join('; ')
    throw new Error(
      `Updated ${data.count} stock(s), but some failed: ${detail}`
    )
  }

  return {
    success: true,
    message: data?.message || `Updated prices for ${data?.count ?? 0} stock(s)`,
    count: data?.count ?? 0,
    stocks: data?.stocks || [],
  }
}
