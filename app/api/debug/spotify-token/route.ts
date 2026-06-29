import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'not available' }, { status: 403 })
  }

  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()

  if (userError || !session || !user) {
    return NextResponse.json({ authenticated: false })
  }

  // Log full session to terminal so we can inspect scope grants
  console.log('[debug/spotify-token] session.user.app_metadata:', JSON.stringify(user.app_metadata, null, 2))
  console.log('[debug/spotify-token] session.user.identities:', JSON.stringify(user.identities, null, 2))
  console.log('[debug/spotify-token] provider_token present:', !!session.provider_token)
  console.log('[debug/spotify-token] provider_refresh_token present:', !!session.provider_refresh_token)

  // Try to verify the provider token is actually valid by calling /v1/me
  let spotifyMe: Record<string, unknown> | null = null
  let spotifyMeError: string | null = null
  if (session.provider_token) {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${session.provider_token}` },
      cache: 'no-store',
    })
    if (res.ok) {
      spotifyMe = await res.json()
    } else {
      spotifyMeError = `${res.status} ${res.statusText}`
    }
  }

  // Attempt a dry-run of the exact failing call so we can see the full Spotify error body
  let playlistTestError: unknown = null
  if (session.provider_token && spotifyMe) {
    const res = await fetch(`https://api.spotify.com/v1/users/${spotifyMe.id}/playlists`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.provider_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '__dndj_scope_test__', public: false }),
      cache: 'no-store',
    })
    const body = await res.json()
    playlistTestError = res.ok ? null : body
    console.log('[debug/spotify-token] playlist create test:', res.status, JSON.stringify(body, null, 2))

    // Clean up if it accidentally succeeded
    if (res.ok && body.id) {
      await fetch(`https://api.spotify.com/v1/playlists/${body.id}/followers`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.provider_token}` },
      })
    }
  }

  return NextResponse.json({
    authenticated: true,
    user: { id: user.id, email: user.email },
    spotifyProfile: spotifyMe
      ? { id: spotifyMe.id, display_name: spotifyMe.display_name, product: spotifyMe.product }
      : null,
    spotifyMeError,
    tokenInfo: {
      hasProviderToken: !!session.provider_token,
      hasProviderRefreshToken: !!session.provider_refresh_token,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
    },
    playlistCreateTest: playlistTestError ?? 'ok',
    appMetadata: user.app_metadata,
  })
}
