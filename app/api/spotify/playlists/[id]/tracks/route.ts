import { spotifyFetch, SpotifyError } from '@/lib/spotify/fetch'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const res = await spotifyFetch(`/v1/playlists/${id}/items?limit=50`)
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
