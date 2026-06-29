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

  let res: Response
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${session.provider_token}`,
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
