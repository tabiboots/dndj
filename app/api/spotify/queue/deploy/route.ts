import { spotifyFetch, SpotifyError } from '@/lib/spotify/fetch'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  let body: { uris?: string[]; playlistId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid request body' }, { status: 400 })
  }

  const { uris, playlistId } = body

  if (!Array.isArray(uris) || uris.length === 0) {
    return NextResponse.json({ error: 'uris must be a non-empty array' }, { status: 400 })
  }

  try {
    // 1. Check for an active device — playback will fail silently without one
    const devicesRes = await spotifyFetch('/v1/me/player/devices')
    const { devices } = await devicesRes.json()
    const activeDevice = devices?.find((d: { is_active: boolean }) => d.is_active)

    if (!activeDevice) {
      return NextResponse.json(
        { error: 'No active Spotify device found. Open Spotify on any device and try again.' },
        { status: 409 }
      )
    }

    // 2. Start first track immediately — don't wait for playlist setup
    await spotifyFetch('/v1/me/player/play', {
      method: 'PUT',
      body: JSON.stringify({
        uris: [uris[0]],
        position_ms: 0,
      }),
    })
    console.log('[queue/deploy] playback started:', uris[0])

    // 3. Get or create the dndj playlist (music is already playing while this runs)
    let resolvedPlaylistId = playlistId ?? null

    if (resolvedPlaylistId) {
      try {
        await spotifyFetch(`/v1/playlists/${resolvedPlaylistId}`)
      } catch {
        console.warn('[queue/deploy] stored playlist gone — creating new one')
        resolvedPlaylistId = null
      }
    }

    if (!resolvedPlaylistId) {
      const createRes = await spotifyFetch('/v1/me/playlists', {
        method: 'POST',
        body: JSON.stringify({
          name: 'dndj queue',
          description: 'Managed by dndj. Overwritten on each deploy.',
          public: false,
        }),
      })
      const playlist = await createRes.json()
      resolvedPlaylistId = playlist.id
      console.log('[queue/deploy] created playlist:', resolvedPlaylistId)
    }

    // 4. Replace playlist with all tracks
    await spotifyFetch(`/v1/playlists/${resolvedPlaylistId}/items`, {
      method: 'PUT',
      body: JSON.stringify({ uris }),
    })

    // 5. Add remaining tracks to the native queue so they follow what's playing
    for (const uri of uris.slice(1)) {
      await spotifyFetch(`/v1/me/player/queue?uri=${encodeURIComponent(uri)}`, {
        method: 'POST',
      })
    }

    console.log(`[queue/deploy] deployed ${uris.length} tracks — playlist: ${resolvedPlaylistId}`)

    return NextResponse.json({ ok: true, playlistId: resolvedPlaylistId })
  } catch (err) {
    if (err instanceof SpotifyError) {
      return NextResponse.json(
        { error: err.message, code: err.code, ...(err.retryAfter ? { retryAfter: err.retryAfter } : {}) },
        { status: err.status }
      )
    }
    console.error('[queue/deploy] unexpected error', err)
    return NextResponse.json({ error: 'internal server error' }, { status: 500 })
  }
}
