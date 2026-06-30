import { createClient } from '@/lib/supabase/server'

export class SpotifyError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: 'unauthenticated' | 'forbidden' | 'rate_limited' | 'spotify_error' | 'network_error',
    public retryAfter?: number
  ) {
    super(message)
    this.name = 'SpotifyError'
  }
}

export async function spotifyFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const supabase = await createClient()

  // getUser() validates the session server-side; getSession() only reads the cookie
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new SpotifyError('No authenticated user', 401, 'unauthenticated')
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.provider_token) {
    throw new SpotifyError('No Spotify provider token in session', 401, 'unauthenticated')
  }

  const url = `https://api.spotify.com${path}`
  const start = Date.now()

  const token = process.env.FORCE_SPOTIFY_401 === '1' ? 'invalid_test_token' : session.provider_token

  let res: Response
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      cache: 'no-store',
    })
  } catch (err) {
    console.error(`[spotify] network error — ${path}`, err)
    throw new SpotifyError('Network error reaching Spotify', 502, 'network_error')
  }

  const elapsed = Date.now() - start
  console.log(`[spotify] ${options.method ?? 'GET'} ${path} → ${res.status} (${elapsed}ms) user:${user.id}`)

  if (res.status === 401) {
    // Supabase doesn't refresh the Spotify provider_token on session refresh,
    // so we call Spotify's token endpoint directly using the stored refresh token.
    const refreshToken = session.provider_refresh_token
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

    if (refreshToken && clientId && clientSecret) {
      console.log(`[spotify] 401 on ${path} — refreshing Spotify token directly`)
      try {
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
          body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
        })

        if (tokenRes.ok) {
          const { access_token } = await tokenRes.json()
          let retryRes: Response
          try {
            retryRes = await fetch(url, {
              ...options,
              headers: {
                Authorization: `Bearer ${access_token}`,
                'Content-Type': 'application/json',
                ...options.headers,
              },
              cache: 'no-store',
            })
          } catch (networkErr) {
            console.error(`[spotify] network error on retry — ${path}`, networkErr)
            throw new SpotifyError('Network error reaching Spotify', 502, 'network_error')
          }
          const elapsed2 = Date.now() - start
          console.log(`[spotify] ${options.method ?? 'GET'} ${path} → ${retryRes.status} (after token refresh, ${elapsed2}ms) user:${user.id}`)
          if (retryRes.status !== 401) return retryRes
        } else {
          console.warn(`[spotify] Spotify token refresh failed — status:`, tokenRes.status)
        }
      } catch (err) {
        console.error('[spotify] token refresh error', err)
      }
    } else {
      console.warn('[spotify] cannot refresh — missing refresh token or client credentials')
    }

    throw new SpotifyError('Spotify token expired or revoked', 401, 'unauthenticated')
  }

  if (res.status === 403) {
    const body = await res.json().catch(() => ({}))
    console.error(`[spotify] 403 forbidden — missing scope?`, body)
    throw new SpotifyError('Missing Spotify scope', 403, 'forbidden')
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') ?? 1)
    console.warn(`[spotify] rate limited — retry after ${retryAfter}s`)
    throw new SpotifyError('Spotify rate limit hit', 429, 'rate_limited', retryAfter)
  }

  return res
}
