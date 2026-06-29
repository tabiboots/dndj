import { spotifyFetch, SpotifyError } from '@/lib/spotify/fetch'
import { NextResponse, type NextRequest } from 'next/server'

const ALLOWED_TYPES = ['track', 'album', 'artist', 'playlist'] as const
type SearchType = (typeof ALLOWED_TYPES)[number]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const type = (searchParams.get('type') ?? 'track') as SearchType
  const limit = Math.min(Number(searchParams.get('limit') ?? 10), 50)
  const offset = Number(searchParams.get('offset') ?? 0)

  if (!q) {
    return NextResponse.json({ error: 'missing query param: q' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `invalid type. allowed: ${ALLOWED_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  const params = new URLSearchParams({ q, type, limit: String(limit), offset: String(offset) })

  try {
    const res = await spotifyFetch(`/v1/search?${params}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof SpotifyError) {
      return NextResponse.json(
        { error: err.message, code: err.code, ...(err.retryAfter ? { retryAfter: err.retryAfter } : {}) },
        { status: err.status }
      )
    }
    console.error('[spotify/search] unexpected error', err)
    return NextResponse.json({ error: 'internal server error' }, { status: 500 })
  }
}
