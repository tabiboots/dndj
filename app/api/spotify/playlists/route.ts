import { spotifyFetch, SpotifyError } from '@/lib/spotify/fetch'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const userId = new URL(request.url).searchParams.get('userId')
  const endpoint = userId
    ? `/v1/users/${encodeURIComponent(userId)}/playlists?limit=20`
    : '/v1/me/playlists?limit=20'

  try {
    const res = await spotifyFetch(endpoint)
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
