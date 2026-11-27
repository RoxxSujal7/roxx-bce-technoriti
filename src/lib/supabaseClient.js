import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.REACT_APP_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const UPI_CONFIG = {
  vpa: (process.env.REACT_APP_UPI_VPA || 'bcebhagalpur@upi').trim(),
  payeeName: (process.env.REACT_APP_UPI_PAYEE_NAME || 'Technoriti 2026 BCE').trim(),
};

export async function callEdgeFunction(
  functionName,
  { method = 'POST', body, query, isCsv = false, onCsvMeta } = {},
) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Backend not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.');
  }

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr || !sessionData?.session?.access_token) {
    const authErr = new Error('Your session has expired. Please sign in again.');
    authErr.code = 'UNAUTHORIZED';
    authErr.status = 401;
    throw authErr;
  }

  const url = new URL(`${supabaseUrl}/functions/v1/${functionName}`);
  if (query && typeof query === 'object') {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const headers = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${sessionData.session.access_token}`,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 20000) : null;
  let response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller?.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeoutErr = new Error('Request timed out. Please check your connection and retry.');
      timeoutErr.code = 'TIMEOUT';
      throw timeoutErr;
    }
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    // Clear stale client session cleanly on expired/revoked token
    await supabase.auth.signOut().catch(() => {});
  }

  if (isCsv && response.ok) {
    if (typeof onCsvMeta === 'function') {
      onCsvMeta({
        totalCount: Number(response.headers.get('X-Total-Count') || 0),
        truncated: response.headers.get('X-Export-Truncated') === 'true',
      });
    }
    return await response.text();
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const msg = payload?.error?.message || `Request failed (${response.status})`;
    const err = new Error(msg);
    err.status = response.status;
    err.code = payload?.error?.code || 'API_ERROR';
    throw err;
  }

  if (payload === null) {
    const parseErr = new Error('Received an invalid response from the server.');
    parseErr.code = 'INVALID_RESPONSE';
    throw parseErr;
  }

  return payload;
}
