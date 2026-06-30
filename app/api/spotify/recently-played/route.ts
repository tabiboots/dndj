import { spotifyFetch, SpotifyError } from '@/lib/spotify/fetch'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await spotifyFetch('/v1/me/player/recently-played?limit=10')
    const data = await res.json()
    if (!res.ok) return NextResponse.json(data, { status: res.status })
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof SpotifyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
    }
    return NextResponse.json({ error: 'internal server error' }, { status: 500 })
  }
}
