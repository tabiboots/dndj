import { spotifyFetch, SpotifyError } from '@/lib/spotify/fetch'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await spotifyFetch('/v1/me/player')

    // 204 means Spotify is open but nothing is playing
    if (res.status === 204) {
      return NextResponse.json({ is_playing: false, item: null })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof SpotifyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
    }
    return NextResponse.json({ error: 'internal server error' }, { status: 500 })
  }
}
